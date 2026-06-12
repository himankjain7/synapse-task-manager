import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ProjectService } from '../services/project.service';
import { WorkspaceService } from '../services/workspace.service';
import { TaskService } from '../services/task.service';

// Strongly-typed socket with optional authenticated user
interface SocketUser {
  id: string;
  email?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

let io: Server | null = null;

/**
 * Initialize a production-ready Socket.io server with namespace routing.
 * Namespaces implemented:
 *  - /notifications               -> user notifications
 *  - /projects/:projectId         -> project collaboration (implemented via dynamic ns)
 *  - /tasks/:taskId               -> task updates (dynamic ns)
 *  - /activity/:workspaceId       -> workspace activity feed (dynamic ns)
 *
 * Each namespace performs a JWT authentication handshake and validates
 * that the connecting user has access to the requested resource.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGINS ? process.env.SOCKET_CORS_ORIGINS.split(',') : '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
  });

  // Central auth middleware used by namespaces
  const authMiddleware = async (socket: AuthenticatedSocket, next: (err?: any) => void) => {
    try {
      const token = (socket.handshake.auth && socket.handshake.auth.token) || socket.handshake.headers['authorization'];
      if (!token) return next(new Error('Authentication error: Token required'));

      const raw = typeof token === 'string' && token.startsWith('Bearer ') ? token.split(' ')[1] : token as string;
      const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_replace_in_production';
      const decoded = jwt.verify(raw, jwtSecret) as any;

      socket.user = { id: decoded.sub || decoded.id, email: decoded.email } as SocketUser;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  };

  // ---- /notifications namespace (per-user notifications) ----
  const notifications = io.of('/notifications');
  notifications.use(authMiddleware);
  notifications.on('connection', (socket: AuthenticatedSocket) => {
    // Join user's personal room so server can push notifications
    const userId = socket.user!.id;
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });

    socket.on('error', (err) => {
      console.error('[Socket][notifications] error', err);
    });
  });

  // Helper to create dynamic namespaces that follow /projects/:projectId etc.
  const makeDynamicNs = (match: RegExp, onConnect: (ns: string, socket: AuthenticatedSocket) => Promise<void>) => {
    io!.of(match).use(authMiddleware).on('connection', async (socket: AuthenticatedSocket) => {
      const nsName = socket.nsp.name; // e.g. /projects/123
      try {
        await onConnect(nsName, socket);
      } catch (err: any) {
        // Deny connection by emitting error and disconnecting
        socket.emit('error', { code: 'FORBIDDEN', message: err?.message || 'Access denied' });
        socket.disconnect(true);
      }
    });
  };

  // ---- /projects/:projectId namespace ----
  makeDynamicNs(/^\/projects\/.+$/, async (nsName, socket) => {
    const parts = nsName.split('/');
    const projectId = parts[2];
    const userId = socket.user!.id;

    // Validate that user is member of the project workspace
    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) throw new Error('User is not a member of this project');

    // Join standard rooms for message routing
    socket.join(`user:${userId}`);
    socket.join(`project:${projectId}`);

    // If project has workspaceId, also join workspace room
    const project = await ProjectService.getProjectById(projectId);
    if (project?.workspaceId) {
      socket.join(`workspace:${project.workspaceId}`);
    }

    // Connection lifecycle handlers
    socket.on('disconnect', () => {
      socket.leave(`project:${projectId}`);
      socket.leave(`user:${userId}`);
      if (project?.workspaceId) socket.leave(`workspace:${project.workspaceId}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket][projects:${projectId}] error`, err);
    });
  });

  // ---- /tasks/:taskId namespace ----
  makeDynamicNs(/^\/tasks\/.+$/, async (nsName, socket) => {
    const parts = nsName.split('/');
    const taskId = parts[2];
    const userId = socket.user!.id;

    // Validate that user has access to the task's project
    const task = await TaskService.getTaskById(taskId);
    const projectId = task?.projectId;
    if (!projectId) throw new Error('Task or project not found');

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) throw new Error('User is not a member of this task/project');

    socket.join(`task:${taskId}`);
    socket.join(`project:${projectId}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket][tasks:${taskId}] error`, err);
    });
  });

  // ---- /activity/:workspaceId namespace ----
  makeDynamicNs(/^\/activity\/.+$/, async (nsName, socket) => {
    const parts = nsName.split('/');
    const workspaceId = parts[2];
    const userId = socket.user!.id;

    const canAccess = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!canAccess) throw new Error('User is not a member of this workspace');

    socket.join(`workspace:${workspaceId}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket][activity:${workspaceId}] error`, err);
    });
  });

  // Global error handler
  io.on('error', (err) => {
    console.error('[Socket][io] error', err);
  });

  return io;
};

/**
 * Get the initialized io instance. Throws if not initialized.
 */
export const getIo = (): Server => {
  if (!io) throw new Error('Socket.io server not initialized');
  return io;
};

/**
 * Broadcast helper for controllers to emit events into project/workspace rooms.
 */
export const broadcast = (room: string, event: string, payload: any) => {
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch (err) {
    console.error('[Socket][broadcast] failed', err);
  }
};

export default initSocketServer;
