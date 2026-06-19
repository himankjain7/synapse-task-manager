import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

// Import Routers
import authRouter from './routes/auth.routes';
import workspaceRouter from './routes/workspace.routes';
import projectRouter from './routes/project.routes';
import taskRouter from './routes/task.routes';
import commentRouter from './routes/comment.routes';
import labelRouter from './routes/label.routes';

// Import Middlewares
import { errorHandler } from './middleware/error.middleware';
import { initSocketServer } from './socket';

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount API Route Namespace
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/workspaces/:workspaceId/projects', projectRouter);
app.use('/api/v1/projects/:projectId/tasks', taskRouter);
app.use('/api/v1/tasks/:taskId/comments', commentRouter);
app.use('/api/v1/projects/:projectId', labelRouter);
app.use('/api/v1/tasks', labelRouter);

// Global Exception Interceptor Middleware (must be registered last)
app.use(errorHandler);

// Instantiate HTTP server wrapping Express
const server = http.createServer(app);

// Bind Socket.io to the server instances
initSocketServer(server);

// Start listening for connections
// Start listening for connections on all network interfaces
server.listen(Number(port), '0.0.0.0', () => {
  console.log(`[Synapse Server]: Core API operational at http://localhost:${port}`);
  console.log(`[Synapse Server]: Accessible on your local network at http://192.168.1.2:${port}`);
  console.log(`[Synapse Server]: Real-time Sockets listening at ws://192.168.1.2:${port}`);
});
