"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
const workspace_service_1 = require("../services/workspace.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
const notification_1 = require("../utils/notification");
/**
 * Project Controller
 *
 * Handles HTTP requests for project operations:
 * - Create/read/update/delete projects
 * - Archive/unarchive projects
 * - Get project statistics
 *
 * All operations require workspace membership.
 */
class ProjectController {
    /**
     * POST /workspaces/:workspaceId/projects
     * Create a new project
     *
     * Request body:
     * {
     *   name: string (required, 1-100 chars),
     *   description?: string (max 500 chars),
     *   color?: string (hex color)
     * }
     *
     * Response: 201 Created
     * Project object with owner information
     *
     * Errors:
     * - 400: Invalid input
     * - 403: Not workspace member
     * - 404: Workspace not found
     */
    static createProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { workspaceId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify user is member of workspace
        const isMember = await workspace_service_1.WorkspaceService.canAccessWorkspace(workspaceId, userId);
        if (!isMember) {
            throw new error_middleware_2.ForbiddenError('You are not a member of this workspace');
        }
        const data = req.body;
        const project = await project_service_1.ProjectService.createProject(workspaceId, userId, data);
        if (project) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'project_created', 'Project Created', `${actor.name} created project "${project.name}"`, actor, undefined, project.id, workspaceId);
            io.to(`workspace:${workspaceId}`).emit('notification', payload);
            io.to(`workspace:${workspaceId}`).emit('project:created', { project });
        }
        res.status(201).json({
            success: true,
            data: project,
            message: 'Project created',
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces/:workspaceId/projects/:id
     * Get project details
     *
     * Response: 200 OK
     * Project object with owner information
     *
     * Errors:
     * - 404: Project not found
     * - 403: Not workspace member
     */
    static getProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify access to workspace
        const canAccess = await project_service_1.ProjectService.canAccessProject(id, userId);
        if (!canAccess) {
            throw new error_middleware_2.ForbiddenError('You do not have access to this project');
        }
        const project = await project_service_1.ProjectService.getProjectById(id);
        if (!project) {
            throw new error_middleware_2.NotFoundError('Project', id);
        }
        res.status(200).json({
            success: true,
            data: project,
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces/:workspaceId/projects
     * List projects in workspace with pagination
     *
     * Query params:
     * - status?: 'active' | 'archived' | 'on_hold' (filter by status)
     * - page: number (default 1)
     * - limit: number (default 20)
     *
     * Response: 200 OK
     * Paginated list of projects
     */
    static listProjects = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await project_service_1.ProjectService.getUserProjects(userId, status, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /workspaces/:workspaceId/projects/:id
     * Update project details
     *
     * Request body:
     * {
     *   name?: string,
     *   description?: string,
     *   color?: string
     * }
     *
     * Response: 200 OK
     * Updated project object
     *
     * Errors:
     * - 403: Not authorized (only owner/admin)
     * - 404: Project not found
     */
    static updateProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const data = req.body;
        const project = await project_service_1.ProjectService.updateProject(id, userId, data);
        res.status(200).json({
            success: true,
            data: project,
            message: 'Project updated',
            timestamp: new Date(),
        });
    });
    /**
     * POST /workspaces/:workspaceId/projects/:id/archive
     * Archive a project
     *
     * Response: 200 OK
     * Updated project object (status: ARCHIVED)
     */
    static archiveProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const project = await project_service_1.ProjectService.archiveProject(id, userId);
        if (project) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'project_archived', 'Project Archived', `${actor.name} archived project "${project.name}"`, actor, undefined, project.id, project.workspaceId);
            io.to(`workspace:${project.workspaceId}`).emit('notification', payload);
            io.to(`project:${project.id}`).emit('project:archived', { project });
        }
        res.status(200).json({
            success: true,
            data: project,
            message: 'Project archived',
            timestamp: new Date(),
        });
    });
    /**
     * POST /workspaces/:workspaceId/projects/:id/unarchive
     * Unarchive a project
     *
     * Response: 200 OK
     * Updated project object (status: ACTIVE)
     */
    static unarchiveProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const project = await project_service_1.ProjectService.unarchiveProject(id, userId);
        if (project) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'project_unarchived', 'Project Unarchived', `${actor.name} unarchived project "${project.name}"`, actor, undefined, project.id, project.workspaceId);
            io.to(`workspace:${project.workspaceId}`).emit('notification', payload);
            io.to(`project:${project.id}`).emit('project:unarchived', { project });
        }
        res.status(200).json({
            success: true,
            data: project,
            message: 'Project unarchived',
            timestamp: new Date(),
        });
    });
    /**
     * DELETE /workspaces/:workspaceId/projects/:id
     * Delete project (cascades to tasks, comments)
     *
     * Response: 204 No Content
     *
     * Errors:
     * - 403: Not authorized (owner/admin only)
     * - 404: Project not found
     */
    static deleteProject = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        await project_service_1.ProjectService.deleteProject(id, userId);
        res.status(204).send();
    });
    /**
     * GET /workspaces/:workspaceId/projects/:id/stats
     * Get project statistics
     *
     * Returns task counts and completion percentage.
     *
     * Response: 200 OK
     * {
     *   totalTasks: number,
     *   completedTasks: number,
     *   todoTasks: number,
     *   inProgressTasks: number,
     *   completionPercentage: number
     * }
     */
    static getProjectStats = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const stats = await project_service_1.ProjectService.getProjectStats(id);
        res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date(),
        });
    });
}
exports.ProjectController = ProjectController;
