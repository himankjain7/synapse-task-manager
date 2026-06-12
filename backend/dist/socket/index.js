"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.getIo = exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const project_service_1 = require("../services/project.service");
const workspace_service_1 = require("../services/workspace.service");
const task_service_1 = require("../services/task.service");
let io = null;
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
const initSocketServer = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGINS ? process.env.SOCKET_CORS_ORIGINS.split(',') : '*',
            methods: ['GET', 'POST'],
        },
        pingInterval: 25000,
        pingTimeout: 60000,
        maxHttpBufferSize: 1e6,
    });
    // Central auth middleware used by namespaces
    const authMiddleware = async (socket, next) => {
        try {
            const token = (socket.handshake.auth && socket.handshake.auth.token) || socket.handshake.headers['authorization'];
            if (!token)
                return next(new Error('Authentication error: Token required'));
            const raw = typeof token === 'string' && token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_replace_in_production';
            const decoded = jsonwebtoken_1.default.verify(raw, jwtSecret);
            socket.user = { id: decoded.sub || decoded.id, email: decoded.email };
            return next();
        }
        catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    };
    // ---- /notifications namespace (per-user notifications) ----
    const notifications = io.of('/notifications');
    notifications.use(authMiddleware);
    notifications.on('connection', (socket) => {
        // Join user's personal room so server can push notifications
        const userId = socket.user.id;
        socket.join(`user:${userId}`);
        socket.on('disconnect', () => {
            socket.leave(`user:${userId}`);
        });
        socket.on('error', (err) => {
            console.error('[Socket][notifications] error', err);
        });
    });
    // Helper to create dynamic namespaces that follow /projects/:projectId etc.
    const makeDynamicNs = (match, onConnect) => {
        io.of(match).use(authMiddleware).on('connection', async (socket) => {
            const nsName = socket.nsp.name; // e.g. /projects/123
            try {
                await onConnect(nsName, socket);
            }
            catch (err) {
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
        const userId = socket.user.id;
        // Validate that user is member of the project workspace
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess)
            throw new Error('User is not a member of this project');
        // Join standard rooms for message routing
        socket.join(`user:${userId}`);
        socket.join(`project:${projectId}`);
        // If project has workspaceId, also join workspace room
        const project = await project_service_1.ProjectService.getProjectById(projectId);
        if (project?.workspaceId) {
            socket.join(`workspace:${project.workspaceId}`);
        }
        // Connection lifecycle handlers
        socket.on('disconnect', () => {
            socket.leave(`project:${projectId}`);
            socket.leave(`user:${userId}`);
            if (project?.workspaceId)
                socket.leave(`workspace:${project.workspaceId}`);
        });
        socket.on('error', (err) => {
            console.error(`[Socket][projects:${projectId}] error`, err);
        });
    });
    // ---- /tasks/:taskId namespace ----
    makeDynamicNs(/^\/tasks\/.+$/, async (nsName, socket) => {
        const parts = nsName.split('/');
        const taskId = parts[2];
        const userId = socket.user.id;
        // Validate that user has access to the task's project
        const task = await task_service_1.TaskService.getTaskById(taskId);
        const projectId = task?.projectId;
        if (!projectId)
            throw new Error('Task or project not found');
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess)
            throw new Error('User is not a member of this task/project');
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
        const userId = socket.user.id;
        const canAccess = await workspace_service_1.WorkspaceService.canAccessWorkspace(workspaceId, userId);
        if (!canAccess)
            throw new Error('User is not a member of this workspace');
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
exports.initSocketServer = initSocketServer;
/**
 * Get the initialized io instance. Throws if not initialized.
 */
const getIo = () => {
    if (!io)
        throw new Error('Socket.io server not initialized');
    return io;
};
exports.getIo = getIo;
/**
 * Broadcast helper for controllers to emit events into project/workspace rooms.
 */
const broadcast = (room, event, payload) => {
    if (!io)
        return;
    try {
        io.to(room).emit(event, payload);
    }
    catch (err) {
        console.error('[Socket][broadcast] failed', err);
    }
};
exports.broadcast = broadcast;
exports.default = exports.initSocketServer;
