import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

interface SocketUser {
  userId: string;
  email: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

/**
 * Initialize the Socket.io Server with authentication handshake
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust in production to allow only trusted origins
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Handshake Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      // Clean token string if "Bearer <token>" formatting is used
      const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
      const decoded = jwt.verify(cleanToken, jwtSecret) as any;
      
      socket.user = { userId: decoded.userId ?? decoded.id ?? decoded.sub, email: decoded.email };
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Client lifecycle events
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    console.log(`[Socket Connected]: User ${socket.user?.email} (ID: ${userId})`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Channel membership: Join a project room
    socket.on('join:project', (payload: { projectId: string }) => {
      if (payload.projectId) {
        socket.join(`project:${payload.projectId}`);
        console.log(`[Socket Room]: Socket ${socket.id} joined project:${payload.projectId}`);
      }
    });

    // Channel membership: Leave a project room
    socket.on('leave:project', (payload: { projectId: string }) => {
      if (payload.projectId) {
        socket.leave(`project:${payload.projectId}`);
        console.log(`[Socket Room]: Socket ${socket.id} left project:${payload.projectId}`);
      }
    });

    // Typing Activity Indicator Broadcast
    socket.on('typing:start', (payload: { projectId: string; taskId: string; userName: string }) => {
      socket.to(`project:${payload.projectId}`).emit('user:typing', {
        taskId: payload.taskId,
        userName: payload.userName,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (payload: { projectId: string; taskId: string; userName: string }) => {
      socket.to(`project:${payload.projectId}`).emit('user:typing', {
        taskId: payload.taskId,
        userName: payload.userName,
        isTyping: false,
      });
    });

    socket.on('disconnect', () => {
      if (userId) {
        socket.leave(`user:${userId}`);
      }
      console.log(`[Socket Disconnected]: Socket ID ${socket.id}`);
    });
  });

  return io;
};

/**
 * Getter to access the io instance from HTTP REST controllers
 */
export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.io server has not been initialized');
  }
  return io;
};

/**
 * Helper to emit a real-time event directly from controllers
 */
export const broadcastToProject = (projectId: string, event: string, payload: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
};

/**
 * Send a notification to a specific user's room
 */
export const sendNotification = (
  userId: string,
  notification: { id: string; type: string; title: string; body: string; data?: Record<string, string>; read: boolean; createdAt: string }
) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};
