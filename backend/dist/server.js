"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environmental variables
dotenv_1.default.config();
// Import Routers
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const workspace_routes_1 = __importDefault(require("./routes/workspace.routes"));
const project_routes_1 = __importDefault(require("./routes/project.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const comment_routes_1 = __importDefault(require("./routes/comment.routes"));
const label_routes_1 = __importDefault(require("./routes/label.routes"));
const standalone_task_routes_1 = __importDefault(require("./routes/standalone-task.routes"));
// Import Middlewares
const error_middleware_1 = require("./middleware/error.middleware");
const socket_1 = require("./socket");
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Enable CORS and JSON parsing
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health Check Endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Mount API Route Namespace
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/workspaces', workspace_routes_1.default);
app.use('/api/v1/workspaces/:workspaceId/projects', project_routes_1.default);
app.use('/api/v1/projects/:projectId/tasks', task_routes_1.default);
app.use('/api/v1/tasks', standalone_task_routes_1.default);
app.use('/api/v1/tasks/:taskId/comments', comment_routes_1.default);
app.use('/api/v1/projects/:projectId', label_routes_1.default);
app.use('/api/v1/tasks', label_routes_1.default);
// Global Exception Interceptor Middleware (must be registered last)
app.use(error_middleware_1.errorHandler);
// Instantiate HTTP server wrapping Express
const server = http_1.default.createServer(app);
// Bind Socket.io to the server instances
(0, socket_1.initSocketServer)(server);
// Start listening for connections
// Start listening for connections on all network interfaces
server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Synapse Server]: Core API operational at http://localhost:${port}`);
    console.log(`[Synapse Server]: Accessible on your local network at http://192.168.1.2:${port}`);
    console.log(`[Synapse Server]: Real-time Sockets listening at ws://192.168.1.2:${port}`);
});
