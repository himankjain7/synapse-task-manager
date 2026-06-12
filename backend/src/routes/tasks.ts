import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { CommentService } from '../services/comment.service';
import { broadcastToProject } from '../socket';
import { TaskPriority, TaskStatus } from '../models';

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
router.post('/projects/:projectId/tasks', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const parsed = createTaskSchema.parse(req.body);
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const task = await TaskService.createTask(projectId, userId, {
      projectId,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority as TaskPriority | undefined,
      assignedTo: parsed.assignedTo,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    });

    broadcastToProject(projectId, 'task:created', { task });

    res.status(201).json({ data: { task }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to create task';
    res.status(500).json({ data: null, error: { code: 'CREATE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /projects/:projectId/tasks
 * List tasks in a project with filters and pagination
 */
router.get('/projects/:projectId/tasks', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const parsed = listQuerySchema.parse(req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;

    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to project' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const result = await TaskService.getProjectTasks(projectId, userId, {
      status: parsed.status as TaskStatus | undefined,
      priority: parsed.priority as TaskPriority | undefined,
      assignedTo: parsed.assignedTo,
      page,
      limit,
    });

    res.status(200).json({ data: { tasks: result.data, total: result.total }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list tasks';
    res.status(500).json({ data: null, error: { code: 'LIST_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /tasks/:taskId
 * Get detailed task with comments and activity
 */
router.get('/tasks/:taskId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to task' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const comments = await CommentService.getTaskComments(taskId, userId, 1, 50);
    const activity: unknown[] = [];

    res.status(200).json({
      data: { task, comments: comments.data, activity },
      error: null,
      status: 'ok',
    } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get task';
    res.status(500).json({ data: null, error: { code: 'GET_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * PUT /tasks/:taskId
 * Update a task
 */
router.put('/tasks/:taskId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const parsed = updateTaskSchema.parse(req.body);
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const task = await TaskService.updateTask(taskId, userId, {
      title: parsed.title,
      description: parsed.description,
      status: parsed.status as TaskStatus | undefined,
      priority: parsed.priority as TaskPriority | undefined,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      assignedTo: parsed.assignedTo,
    });
    if (!task) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Task not found' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    broadcastToProject(task.projectId, 'task:updated', { task });

    res.status(200).json({ data: { task }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    if (err instanceof Error && err.message.includes('Forbidden')) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to update task';
    res.status(500).json({ data: null, error: { code: 'UPDATE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * DELETE /tasks/:taskId
 */
router.delete('/tasks/:taskId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    await TaskService.deleteTask(taskId, userId);

    broadcastToProject(taskId, 'task:deleted', { taskId });

    res.status(200).json({ data: { success: true }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Forbidden')) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to delete task';
    res.status(500).json({ data: null, error: { code: 'DELETE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * POST /tasks/:taskId/assign
 * Assign a user to a task
 */
router.post('/tasks/:taskId/assign', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { userId: assigneeId } = req.body;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const assignment = await TaskService.assignTask(taskId, assigneeId);
    const task = await TaskService.getTaskById(taskId);

    if (task) {
      broadcastToProject(task.projectId, 'task:assigned', { taskId, assigneeId });
    }

    res.status(200).json({ data: { assignment }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to assign task';
    res.status(500).json({ data: null, error: { code: 'ASSIGN_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * POST /tasks/:taskId/comments
 * Create comment on a task
 */
router.post('/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const comment = await CommentService.createComment(taskId, userId, { taskId, content });

    const task = await TaskService.getTaskById(taskId);
    if (task) {
      broadcastToProject(task.projectId, 'comment:created', { comment });
    }

    res.status(201).json({ data: { comment }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create comment';
    res.status(500).json({ data: null, error: { code: 'COMMENT_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /tasks/:taskId/comments
 * List comments for a task (paginated)
 */
router.get('/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const parsed = commentsQuerySchema.parse(req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const result = await CommentService.getTaskComments(taskId, userId, page, limit);

    res.status(200).json({
      data: { comments: result.data, total: result.total },
      error: null,
      status: 'ok',
    } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list comments';
    res.status(500).json({ data: null, error: { code: 'LIST_COMMENTS_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

export default router;
