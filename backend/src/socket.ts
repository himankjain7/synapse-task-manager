import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ProjectService } from './services/project.service';

let io: Server | null = null;

interface SocketUser {
  userId: string;
  email: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

const onlineUsers = new Map<string, Set<string>>();

function addOnlineUser(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socketId);
}

function removeOnlineUser(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

function getProjectRoomSockets(projectId: string): AuthenticatedSocket[] {
  if (!io) return [];
  const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
  if (!room) return [];
  return Array.from(room)
    .map((sid) => io!.sockets.sockets.get(sid) as AuthenticatedSocket)
    .filter((s): s is AuthenticatedSocket => !!s && !!s.user);
}

function getProjectOnlineUsers(projectId: string): string[] {
  return getProjectRoomSockets(projectId)
    .map((s) => s.user!.userId)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);
}

/**
 * Initialize the Socket.io Server with authentication handshake
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
      const decoded = jwt.verify(cleanToken, jwtSecret) as any;
      
      socket.user = { userId: decoded.userId ?? decoded.id ?? decoded.sub, email: decoded.email };
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;

    if (userId) {
      socket.join(`user:${userId}`);
      addOnlineUser(userId, socket.id);
    }

    socket.on('join:project', async (payload: { projectId: string }) => {
      if (!payload.projectId || !userId) return;

      try {
        const canAccess = await ProjectService.canAccessProject(payload.projectId, userId);
        if (!canAccess) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
          return;
        }
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('project:')) {
            const oldProjectId = room.slice('project:'.length);
            if (oldProjectId !== payload.projectId) {
              socket.leave(room);
              socket.to(room).emit('presence:offline', { userId });
            }
          }
        }
        socket.join(`project:${payload.projectId}`);
        socket.to(`project:${payload.projectId}`).emit('presence:online', { userId, socketId: socket.id });
        const online = getProjectOnlineUsers(payload.projectId);
        socket.emit('presence:list', { projectId: payload.projectId, onlineUserIds: online });
      } catch {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
      }
    });

    socket.on('leave:project', (payload: { projectId: string }) => {
      if (payload.projectId) {
        socket.leave(`project:${payload.projectId}`);

        if (userId) {
          socket.to(`project:${payload.projectId}`).emit('presence:offline', { userId });
        }
      }
    });

    socket.on('join:workspace', (payload: { workspaceId: string }) => {
      if (!payload.workspaceId || !userId) return;
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room.startsWith('workspace:')) {
          socket.leave(room);
        }
      }
      socket.join(`workspace:${payload.workspaceId}`);
    });

    socket.on('leave:workspace', (payload: { workspaceId: string }) => {
      if (payload.workspaceId) {
        socket.leave(`workspace:${payload.workspaceId}`);
      }
    });

    socket.on('typing:start', (payload: { projectId: string; taskId: string; userName: string; avatarUrl?: string | null }) => {
      if (!userId) return;
      socket.to(`project:${payload.projectId}`).emit('user:typing', {
        taskId: payload.taskId,
        userId,
        userName: payload.userName,
        avatarUrl: payload.avatarUrl || null,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (payload: { projectId: string; taskId: string; userName: string }) => {
      if (!userId) return;
      socket.to(`project:${payload.projectId}`).emit('user:typing', {
        taskId: payload.taskId,
        userId,
        userName: payload.userName,
        isTyping: false,
      });
    });

    socket.on('viewing:task:start', (payload: { projectId: string; taskId: string; userName: string }) => {
      if (!userId) return;
      socket.to(`project:${payload.projectId}`).emit('viewing:task', {
        taskId: payload.taskId,
        userId,
        userName: payload.userName,
        isViewing: true,
      });
    });

    socket.on('viewing:task:stop', (payload: { projectId: string; taskId: string }) => {
      if (!userId) return;
      socket.to(`project:${payload.projectId}`).emit('viewing:task', {
        taskId: payload.taskId,
        userId,
        isViewing: false,
      });
    });

    socket.on('disconnect', () => {
      if (userId) {
        removeOnlineUser(userId, socket.id);
        socket.to(`user:${userId}`).emit('presence:offline', { userId });
        socket.leave(`user:${userId}`);

        if (!isUserOnline(userId)) {
          io?.emit('presence:offline', { userId });
        }
      }
    });
  });

  return io;
};

export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.io server has not been initialized');
  }
  return io;
};

export const broadcastToProject = (projectId: string, event: string, payload: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
};

export const sendNotification = (
  userId: string,
  notification: { id: string; type: string; title: string; body: string; data?: Record<string, string>; read: boolean; createdAt: string }
) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

export const broadcast = (room: string, event: string, payload: any) => {
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch (err) {
    console.error('[Socket][broadcast] failed', err);
  }
};
