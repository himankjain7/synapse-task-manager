import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import ProjectService from '../services/project.service';
import TaskService from '../services/task.service';
import CommentService from '../services/comment.service';
import { broadcastToProject } from '../socket';

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.string().optional(),
  page: z.preprocess((v) => Number(v), z.number().int().min(1)).optional(),
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)).optional(),
});

const commentsQuerySchema = z.object({
  page: z.preprocess((v) => Number(v), z.number().int().min(1)).optional(),
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)).optional(),
});

type ApiResponse<T> = { data: T | null; error: { code: string; message: string } | null; status: 'ok' | 'error' };

/**
 * POST /projects/:projectId/tasks
 * Create a task in a project (requires project membership)
 */
router.post('/projects/:projectId/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const parsed = createTaskSchema.parse(req.body);
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' } as ApiResponse<null>);

    const task = await TaskService.createTask(projectId, userId, parsed as any);

    // Emit real-time event to project room
    broadcastToProject(projectId, 'task:created', { task });

    res.status(201).json({ data: { task }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    if (err?.name === 'ZodError') return res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
    res.status(500).json({ data: null, error: { code: 'CREATE_FAILED', message: err?.message || 'Failed to create task' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /projects/:projectId/tasks
 * List tasks in a project with filters and pagination
 */
router.get('/projects/:projectId/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const parsed = listQuerySchema.parse(req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;

    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' } as ApiResponse<null>);

    const result = await TaskService.getProjectTasks(projectId, userId, {
      status: parsed.status as any,
      priority: parsed.priority as any,
      assignedTo: parsed.assignedTo as string | undefined,
    }, page, limit);

    res.status(200).json({ data: { tasks: result.items, total: result.total }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'LIST_FAILED', message: err?.message || 'Failed to list tasks' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /tasks/:taskId
 * Get detailed task with comments, assignees and activity
 */
router.get('/tasks/:taskId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const task = await TaskService.getTaskById(taskId);
    if (!task) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' } as ApiResponse<null>);

    // Verify project membership
    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to task' }, status: 'error' } as ApiResponse<null>);

    const comments = await CommentService.getTaskComments(taskId, userId, 1, 50);

    // Activity logs could be part of TaskService; for now return placeholder
    const activity = await TaskService.getTaskActivity ? await TaskService.getTaskActivity(taskId) : [];

    res.status(200).json({ data: { task, comments: comments.items ?? comments, activity }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'GET_FAILED', message: err?.message || 'Failed to get task' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * PUT /tasks/:taskId
 * Update a task
 */
router.put('/tasks/:taskId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const parsed = updateTaskSchema.parse(req.body);
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const task = await TaskService.updateTask(taskId, userId, parsed as any);
    if (!task) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' } as ApiResponse<null>);

    // Emit update
    broadcastToProject(task.projectId, 'task:updated', { task });

    res.status(200).json({ data: { task }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    if (err?.name === 'ZodError') return res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
    if (err?.message && err.message.includes('Forbidden')) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
    res.status(500).json({ data: null, error: { code: 'UPDATE_FAILED', message: err?.message || 'Failed to update task' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * DELETE /tasks/:taskId
 */
router.delete('/tasks/:taskId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    await TaskService.deleteTask(taskId, userId);

    // Emit deletion
    broadcastToProject(taskId, 'task:deleted', { taskId });

    res.status(200).json({ data: { success: true }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    if (err?.message && err.message.includes('Forbidden')) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
    res.status(500).json({ data: null, error: { code: 'DELETE_FAILED', message: err?.message || 'Failed to delete task' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * POST /tasks/:taskId/assign
 * Assign a user to a task
 */
router.post('/tasks/:taskId/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { userId: assigneeId } = req.body;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const assignment = await TaskService.assignTask(taskId, assigneeId);

    // Emit assignment
    broadcastToProject(assignment.projectId, 'task:assigned', { taskId, assigneeId });

    res.status(200).json({ data: { assignment }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ASSIGN_FAILED', message: err?.message || 'Failed to assign task' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * POST /tasks/:taskId/comments
 * Create comment on a task
 */
router.post('/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const comment = await CommentService.createComment(taskId, userId, { content });

    // Emit comment created
    broadcastToProject(comment.projectId, 'comment:created', { comment });

    res.status(201).json({ data: { comment }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'COMMENT_FAILED', message: err?.message || 'Failed to create comment' }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /tasks/:taskId/comments
 * List comments for a task (paginated)
 */
router.get('/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const parsed = commentsQuerySchema.parse(req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);

    const result = await CommentService.getTaskComments(taskId, userId, page, limit);

    res.status(200).json({ data: { comments: result.items ?? result, total: result.total ?? (result.items ? result.items.length : 0) }, error: null, status: 'ok' } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'LIST_COMMENTS_FAILED', message: err?.message || 'Failed to list comments' }, status: 'error' } as ApiResponse<null>);
  }
});

export default router;
