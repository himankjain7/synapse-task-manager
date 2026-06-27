import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

// Import Utilities
import { sendSuccess } from './utils/response';

// Import Routers
import authRouter from './routes/auth.routes';
import workspaceRouter from './routes/workspace.routes';
import projectRouter from './routes/project.routes';
import taskRouter from './routes/task.routes';
import commentRouter from './routes/comment.routes';
import labelRouter from './routes/label.routes';
import standaloneTaskRouter from './routes/standalone-task.routes';
import analyticsRouter from './routes/analytics.routes';
import searchRouter from './routes/search.routes';
import attachmentRouter from './routes/attachment.routes';
import subtaskRouter from './routes/subtask.routes';
import notificationRouter from './routes/notification.routes';

// Import Middlewares
import { errorHandler } from './middleware/error.middleware';
import { initSocketServer } from './socket';

const app = express();
const port = process.env.PORT || 5000;

// Secure headers with Helmet (allow REST API + frontend frame/connect sources)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    uptime: process.uptime(),
  });
});

// Mount API Route Namespace
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/workspaces/:workspaceId/projects', projectRouter);
app.use('/api/v1/projects/:projectId/tasks', taskRouter);
app.use('/api/v1/tasks', standaloneTaskRouter);
app.use('/api/v1/tasks/:taskId/comments', commentRouter);
app.use('/api/v1/projects/:projectId', labelRouter);
app.use('/api/v1/tasks', labelRouter);

// Mount Analytics, Search, and Attachment routes
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/tasks/:taskId/attachments', attachmentRouter);
app.use('/api/v1/tasks/:taskId/subtasks', subtaskRouter);

// Mount Notification routes
app.use('/api/v1/notifications', notificationRouter);

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Global Exception Interceptor Middleware (must be registered last)
app.use(errorHandler);

// Instantiate HTTP server wrapping Express
const server = http.createServer(app);

// Bind Socket.io to the server instances
initSocketServer(server);

// Start listening only when run directly (not imported for tests)
const isMainModule = !module.parent;
if (isMainModule) {
  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Synapse Server]: Core API operational at http://localhost:${port}`);
    console.log(`[Synapse Server]: Accessible on your local network at http://192.168.1.2:${port}`);
    console.log(`[Synapse Server]: Real-time Sockets listening at ws://192.168.1.2:${port}`);
  });
}

export { app, server };
