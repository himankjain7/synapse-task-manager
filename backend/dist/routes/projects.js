"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const workspace_service_1 = require("../services/workspace.service");
const project_service_1 = require("../services/project.service");
const task_service_1 = require("../services/task.service");
const router = (0, express_1.Router)();
const queryListSchema = zod_1.z.object({
    page: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1).max(100)).optional(),
    sort: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
});
const createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(1000).optional(),
    color: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});
const updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(1000).optional(),
    color: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    status: zod_1.z.string().optional(),
});
/**
 * GET /workspaces/:workspaceId/projects
 * Query: page, limit, sort, status
 * Returns paginated list of projects for workspace
 */
router.get('/workspaces/:workspaceId/projects', auth_1.authenticateToken, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const parsed = queryListSchema.parse(req.query);
        const page = parsed.page ?? 1;
        const limit = parsed.limit ?? 20;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const canAccess = await workspace_service_1.WorkspaceService.canAccessWorkspace(workspaceId, userId);
        if (!canAccess) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to workspace' }, status: 'error' });
            return;
        }
        const result = await project_service_1.ProjectService.getWorkspaceProjects(workspaceId, userId, parsed.status, page, limit);
        res.status(200).json({ data: { projects: result.data, total: result.total, page, limit }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list projects';
        res.status(500).json({ data: null, error: { code: 'LIST_FAILED', message }, status: 'error' });
    }
});
/**
 * POST /workspaces/:workspaceId/projects
 * Body: { name, description, color }
 * Creates a project in the workspace
 */
router.post('/workspaces/:workspaceId/projects', auth_1.authenticateToken, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const parsed = createProjectSchema.parse(req.body);
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const canAccess = await workspace_service_1.WorkspaceService.canAccessWorkspace(workspaceId, userId);
        if (!canAccess) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No access to workspace' }, status: 'error' });
            return;
        }
        const project = await project_service_1.ProjectService.createProject(workspaceId, userId, {
            ...parsed,
            workspaceId,
        });
        res.status(201).json({ data: { project }, error: null, status: 'ok' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: err.message }, status: 'error' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Failed to create project';
        res.status(500).json({ data: null, error: { code: 'CREATE_FAILED', message }, status: 'error' });
    }
});
/**
 * GET /projects/:projectId
 * Returns project with stats
 */
router.get('/projects/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
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
        const project = await project_service_1.ProjectService.getProjectById(projectId);
        if (!project) {
            res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' }, status: 'error' });
            return;
        }
        const stats = await project_service_1.ProjectService.getProjectStats(projectId);
        res.status(200).json({ data: { project, stats }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get project';
        res.status(500).json({ data: null, error: { code: 'GET_FAILED', message }, status: 'error' });
    }
});
/**
 * PUT /projects/:projectId
 * Update project metadata
 */
router.put('/projects/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const parsed = updateProjectSchema.parse(req.body);
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        const project = await project_service_1.ProjectService.updateProject(projectId, userId, {
            ...parsed,
            status: parsed.status,
        });
        if (!project) {
            res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' }, status: 'error' });
            return;
        }
        res.status(200).json({ data: { project }, error: null, status: 'ok' });
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
        const message = err instanceof Error ? err.message : 'Failed to update project';
        res.status(500).json({ data: null, error: { code: 'UPDATE_FAILED', message }, status: 'error' });
    }
});
/**
 * DELETE /projects/:projectId
 */
router.delete('/projects/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 'error' });
            return;
        }
        await project_service_1.ProjectService.deleteProject(projectId, userId);
        res.status(200).json({ data: { success: true }, error: null, status: 'ok' });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: err.message }, status: 'error' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Failed to delete project';
        res.status(500).json({ data: null, error: { code: 'DELETE_FAILED', message }, status: 'error' });
    }
});
/**
 * GET /projects/:projectId/tasks
 * Query: page, limit, status, assigned_to
 */
const tasksQuerySchema = zod_1.z.object({
    page: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1).max(100)).optional(),
    status: zod_1.z.string().optional(),
    assigned_to: zod_1.z.string().optional(),
});
router.get('/projects/:projectId/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const parsed = tasksQuerySchema.parse(req.query);
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
            assignedTo: parsed.assigned_to,
            page,
            limit,
        });
        res.status(200).json({ data: { tasks: result.data, total: result.total }, error: null, status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list tasks';
        res.status(500).json({ data: null, error: { code: 'LIST_TASKS_FAILED', message }, status: 'error' });
    }
});
exports.default = router;
