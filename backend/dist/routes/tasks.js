"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const project_service_1 = require("../services/project.service");
const task_service_1 = require("../services/task.service");
const comment_service_1 = require("../services/comment.service");
const socket_1 = require("../socket");
const router = (0, express_1.Router)();
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: zod_1.z.string().optional(),
    assignedTo: zod_1.z.string().optional(),
});
const updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: zod_1.z.string().optional(),
    assignedTo: zod_1.z.string().optional().nullable(),
});
const listQuerySchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    assignedTo: zod_1.z.string().optional(),
    priority: zod_1.z.string().optional(),
    page: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1).max(100)).optional(),
});
const commentsQuerySchema = zod_1.z.object({
    page: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1).max(100)).optional(),
});
/**
 * POST /projects/:projectId/tasks
 * Create a task in a project (requires project membership)
 */
router.post('/projects/:projectId/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const parsed = createTaskSchema.parse(req.body);
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' });
            return;
        }
        const task = await task_service_1.TaskService.createTask(projectId, userId, {
            projectId,
            title: parsed.title,
            description: parsed.description,
            priority: parsed.priority,
            assignedTo: parsed.assignedTo,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
        });
        (0, socket_1.broadcastToProject)(projectId, 'task:created', { task });
        res.status(201).json({ data: { task }, error: null, status: 'ok' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Failed to create task';
        res.status(500).json({ data: null, error: { code: 'CREATE_FAILED', message }, status: 'error' });
    }
});
/**
 * GET /projects/:projectId/tasks
 * List tasks in a project with filters and pagination
 */
router.get('/projects/:projectId/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const parsed = listQuerySchema.parse(req.query);
        const page = parsed.page ?? 1;
        const limit = parsed.limit ?? 20;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' });
            return;
        }
        const result = await task_service_1.TaskService.getProjectTasks(projectId, userId, {
            status: parsed.status,
            priority: parsed.priority,
            assignedTo: parsed.assignedTo,
            page,
            limit,
        });
        res.status(200).json({ data: { tasks: result.data, total: result.total }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list tasks';
        res.status(500).json({ data: null, error: { code: 'LIST_FAILED', message }, status: 'error' });
    }
});
/**
 * GET /tasks/:taskId
 * Get detailed task with comments and activity
 */
router.get('/tasks/:taskId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (!task) {
            res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' });
            return;
        }
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to task' }, status: 'error' });
            return;
        }
        const comments = await comment_service_1.CommentService.getTaskComments(taskId, userId, 1, 50);
        const activity = [];
        res.status(200).json({
            data: { task, comments: comments.data, activity },
            error: null,
            status: 'ok',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get task';
        res.status(500).json({ data: null, error: { code: 'GET_FAILED', message }, status: 'error' });
    }
});
/**
 * PUT /tasks/:taskId
 * Update a task
 */
router.put('/tasks/:taskId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const parsed = updateTaskSchema.parse(req.body);
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const task = await task_service_1.TaskService.updateTask(taskId, userId, {
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            priority: parsed.priority,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
            assignedTo: parsed.assignedTo,
        });
        if (!task) {
            res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' });
            return;
        }
        (0, socket_1.broadcastToProject)(task.projectId, 'task:updated', { task });
        res.status(200).json({ data: { task }, error: null, status: 'ok' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' });
            return;
        }
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Failed to update task';
        res.status(500).json({ data: null, error: { code: 'UPDATE_FAILED', message }, status: 'error' });
    }
});
/**
 * DELETE /tasks/:taskId
 */
router.delete('/tasks/:taskId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        await task_service_1.TaskService.deleteTask(taskId, userId);
        (0, socket_1.broadcastToProject)(taskId, 'task:deleted', { taskId });
        res.status(200).json({ data: { success: true }, error: null, status: 'ok' });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        res.status(500).json({ data: null, error: { code: 'DELETE_FAILED', message }, status: 'error' });
    }
});
/**
 * POST /tasks/:taskId/assign
 * Assign a user to a task
 */
router.post('/tasks/:taskId/assign', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId: assigneeId } = req.body;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const assignment = await task_service_1.TaskService.assignTask(taskId, assigneeId);
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (task) {
            (0, socket_1.broadcastToProject)(task.projectId, 'task:assigned', { taskId, assigneeId });
        }
        res.status(200).json({ data: { assignment }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to assign task';
        res.status(500).json({ data: null, error: { code: 'ASSIGN_FAILED', message }, status: 'error' });
    }
});
/**
 * POST /tasks/:taskId/comments
 * Create comment on a task
 */
router.post('/tasks/:taskId/comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const comment = await comment_service_1.CommentService.createComment(taskId, userId, { taskId, content });
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (task) {
            (0, socket_1.broadcastToProject)(task.projectId, 'comment:created', { comment });
        }
        res.status(201).json({ data: { comment }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create comment';
        res.status(500).json({ data: null, error: { code: 'COMMENT_FAILED', message }, status: 'error' });
    }
});
/**
 * GET /tasks/:taskId/comments
 * List comments for a task (paginated)
 */
router.get('/tasks/:taskId/comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const parsed = commentsQuerySchema.parse(req.query);
        const page = parsed.page ?? 1;
        const limit = parsed.limit ?? 20;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const result = await comment_service_1.CommentService.getTaskComments(taskId, userId, page, limit);
        res.status(200).json({
            data: { comments: result.data, total: result.total },
            error: null,
            status: 'ok',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list comments';
        res.status(500).json({ data: null, error: { code: 'LIST_COMMENTS_FAILED', message }, status: 'error' });
    }
});
exports.default = router;
