import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { WorkspaceService } from '../services/workspace.service';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { ProjectStatus, TaskStatus } from '../models';

const router = Router();

const queryListSchema = z.object({
  page: z.preprocess((v) => Number(v), z.number().int().min(1)).optional(),
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)).optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  status: z.string().optional(),
});

type ApiResponse<T> = { data: T | null; error: { code: string; message: string } | null; status: 'ok' | 'error' };

/**
 * GET /workspaces/:workspaceId/projects
 * Query: page, limit, sort, status
 * Returns paginated list of projects for workspace
 */
router.get('/workspaces/:workspaceId/projects', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const parsed = queryListSchema.parse(req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;

    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const canAccess = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!canAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to workspace' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const result = await ProjectService.getWorkspaceProjects(
      workspaceId,
      userId,
      parsed.status as ProjectStatus | undefined,
      page,
      limit
    );

    res.status(200).json({ data: { projects: result.data, total: result.total, page, limit }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list projects';
    res.status(500).json({ data: null, error: { code: 'LIST_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * POST /workspaces/:workspaceId/projects
 * Body: { name, description, color }
 * Creates a project in the workspace
 */
router.post('/workspaces/:workspaceId/projects', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const parsed = createProjectSchema.parse(req.body);

    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const canAccess = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!canAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to workspace' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const project = await ProjectService.createProject(workspaceId, userId, {
      ...parsed,
      workspaceId,
    });

    res.status(201).json({ data: { project }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to create project';
    res.status(500).json({ data: null, error: { code: 'CREATE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /projects/:projectId
 * Returns project with stats
 */
router.get('/projects/:projectId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
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

    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const stats = await ProjectService.getProjectStats(projectId);

    res.status(200).json({ data: { project, stats }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get project';
    res.status(500).json({ data: null, error: { code: 'GET_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * PUT /projects/:projectId
 * Update project metadata
 */
router.put('/projects/:projectId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const parsed = updateProjectSchema.parse(req.body);

    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    const project = await ProjectService.updateProject(projectId, userId, {
      ...parsed,
      status: parsed.status as ProjectStatus | undefined,
    });
    if (!project) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    res.status(200).json({ data: { project }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    if (err instanceof Error && err.message.includes('Forbidden')) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to update project';
    res.status(500).json({ data: null, error: { code: 'UPDATE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * DELETE /projects/:projectId
 */
router.delete('/projects/:projectId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' } as ApiResponse<null>);
      return;
    }

    await ProjectService.deleteProject(projectId, userId);

    res.status(200).json({ data: { success: true }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Forbidden')) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' } as ApiResponse<null>);
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to delete project';
    res.status(500).json({ data: null, error: { code: 'DELETE_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

/**
 * GET /projects/:projectId/tasks
 * Query: page, limit, status, assigned_to
 */
const tasksQuerySchema = z.object({
  page: z.preprocess((v) => Number(v), z.number().int().min(1)).optional(),
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)).optional(),
  status: z.string().optional(),
  assigned_to: z.string().optional(),
});

router.get('/projects/:projectId/tasks', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const parsed = tasksQuerySchema.parse(req.query);
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
      assignedTo: parsed.assigned_to,
      page,
      limit,
    });

    res.status(200).json({ data: { tasks: result.data, total: result.total }, error: null, status: 'ok' } as ApiResponse<unknown>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list tasks';
    res.status(500).json({ data: null, error: { code: 'LIST_TASKS_FAILED', message }, status: 'error' } as ApiResponse<null>);
  }
});

export default router;
