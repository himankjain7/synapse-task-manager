import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { WorkspaceService } from '../services/workspace.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { CreateProjectRequest, UpdateProjectRequest } from '../models';

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
export class ProjectController {
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
  static createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify user is member of workspace
    const isMember = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const data: CreateProjectRequest = req.body;
    const project = await ProjectService.createProject(workspaceId, userId, data);

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
  static getProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId, id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify access to workspace
    const canAccess = await ProjectService.canAccessProject(id, userId);
    if (!canAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      throw new NotFoundError('Project', id);
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
  static listProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify membership
    const isMember = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await ProjectService.getWorkspaceProjects(workspaceId, userId, status, page, limit);

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
  static updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: UpdateProjectRequest = req.body;
    const project = await ProjectService.updateProject(id, userId, data);

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
  static archiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const project = await ProjectService.archiveProject(id, userId);

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
  static unarchiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const project = await ProjectService.unarchiveProject(id, userId);

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
  static deleteProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await ProjectService.deleteProject(id, userId);

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
  static getProjectStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const stats = await ProjectService.getProjectStats(id);

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  });
}

