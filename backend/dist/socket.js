"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.broadcastToProject = exports.getIo = exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io = null;
/**
 * Initialize the Socket.io Server with authentication handshake
 */
const initSocketServer = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*', // Adjust in production to allow only trusted origins
            methods: ['GET', 'POST'],
        },
    });
    // Authentication Handshake Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
        if (!token) {
            return next(new Error('Authentication error: Token required'));
        }
        try {
            const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const jwtSecret = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
            const decoded = jsonwebtoken_1.default.verify(cleanToken, jwtSecret);
            socket.user = { userId: decoded.userId ?? decoded.id ?? decoded.sub, email: decoded.email };
            return next();
        }
        catch (_err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });
    // Client lifecycle events
    io.on('connection', (socket) => {
        const userId = socket.user?.userId;
        if (userId) {
            socket.join(`user:${userId}`);
        }
        // Channel membership: Join a project room
        socket.on('join:project', (payload) => {
            if (payload.projectId) {
                socket.join(`project:${payload.projectId}`);
            }
        });
        // Channel membership: Leave a project room
        socket.on('leave:project', (payload) => {
            if (payload.projectId) {
                socket.leave(`project:${payload.projectId}`);
            }
        });
        // Typing Activity Indicator Broadcast
        socket.on('typing:start', (payload) => {
            socket.to(`project:${payload.projectId}`).emit('user:typing', {
                taskId: payload.taskId,
                userName: payload.userName,
                isTyping: true,
            });
        });
        socket.on('typing:stop', (payload) => {
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
        });
    });
    return io;
};
exports.initSocketServer = initSocketServer;
/**
 * Getter to access the io instance from HTTP REST controllers
 */
const getIo = () => {
    if (!io) {
        throw new Error('Socket.io server has not been initialized');
    }
    return io;
};
exports.getIo = getIo;
/**
 * Helper to emit a real-time event directly from controllers
 */
const broadcastToProject = (projectId, event, payload) => {
    if (io) {
        io.to(`project:${projectId}`).emit(event, payload);
    }
};
exports.broadcastToProject = broadcastToProject;
/**
 * Send a notification to a specific user's room
 */
const sendNotification = (userId, notification) => {
    if (io) {
        io.to(`user:${userId}`).emit('notification', notification);
    }
};
exports.sendNotification = sendNotification;
