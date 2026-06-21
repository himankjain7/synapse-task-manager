import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceMemberRole } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { makeNotif, getUserInfo } from '../utils/notification';

/**
 * Workspace Controller
 *
 * Handles HTTP requests for workspace operations:
 * - Create/read/update/delete workspaces
 * - Manage workspace members
 * - Handle role-based access control
 *
 * All endpoints require authentication (checked by middleware).
 * Authorization is checked per endpoint based on user role.
 */
export class WorkspaceController {
  /**
   * POST /workspaces
   * Create a new workspace
   *
   * Request body:
   * {
   *   name: string (required, 1-100 chars),
   *   description?: string (max 500 chars),
   *   logo?: string (hex color)
   * }
   *
   * Response: 201 Created
   * Workspace object with authenticated user as OWNER member
   *
   * Errors:
   * - 400: Invalid input
   * - 401: Not authenticated
   */
  static createWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: CreateWorkspaceRequest = req.body;

    const workspace = await WorkspaceService.createWorkspace(userId, data);

    if (workspace) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const payload = makeNotif(uuidv4(), 'workspace_created', 'Workspace Created',
        `${actor.name} created workspace "${workspace.name}"`,
        actor, undefined, undefined, workspace.id);
      io.to(`user:${userId}`).emit('notification', payload);
    }

    res.status(201).json({
      success: true,
      data: workspace,
      message: 'Workspace created',
      timestamp: new Date(),
    });
  });

  /**
   * GET /workspaces/:id
   * Get workspace details
   *
   * Response: 200 OK
   * Workspace object with owner information
   *
   * Errors:
   * - 404: Workspace not found
   * - 401: Not a member
   */
  static getWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify user is member of workspace
    const hasAccess = await WorkspaceService.canAccessWorkspace(id, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const workspace = await WorkspaceService.getWorkspaceById(id);
    if (!workspace) {
      throw new NotFoundError('Workspace', id);
    }

    res.status(200).json({
      success: true,
      data: workspace,
      timestamp: new Date(),
    });
  });

  /**
   * GET /workspaces
   * List user's workspaces with pagination
   *
   * Query params:
   * - page: number (default 1)
   * - limit: number (default 20, max 100)
   *
   * Response: 200 OK
   * Paginated list of workspaces
   */
  static listWorkspaces = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WorkspaceService.getUserWorkspaces(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  });

  /**
   * PATCH /workspaces/:id
   * Update workspace details
   *
   * Only workspace OWNER or ADMIN can update.
   *
   * Request body:
   * {
   *   name?: string,
   *   description?: string,
   *   logo?: string
   * }
   *
   * Response: 200 OK
   * Updated workspace object
   *
   * Errors:
   * - 403: Not authorized
   * - 404: Workspace not found
   */
  static updateWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check permissions
    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER && role !== WorkspaceMemberRole.ADMIN) {
      throw new ForbiddenError('Only owner or admin can update workspace');
    }

    const data: UpdateWorkspaceRequest = req.body;
    const workspace = await WorkspaceService.updateWorkspace(id, userId, data);

    res.status(200).json({
      success: true,
      data: workspace,
      message: 'Workspace updated',
      timestamp: new Date(),
    });
  });

  /**
   * DELETE /workspaces/:id
   * Delete workspace (cascades to projects, tasks, comments)
   *
   * Only workspace OWNER can delete.
   *
   * Response: 204 No Content
   *
   * Errors:
   * - 403: Not owner
   * - 404: Workspace not found
   */
  static deleteWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check permissions - owner only
    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can delete workspace');
    }

    await WorkspaceService.deleteWorkspace(id, userId);

    res.status(204).send();
  });

  /**
   * POST /workspaces/:id/members
   * Add member to workspace
   *
   * Only OWNER or ADMIN can invite members.
   *
   * Request body:
   * {
   *   email: string (email of user to invite),
   *   role: WorkspaceMemberRole (OWNER/ADMIN/MEMBER/GUEST)
   * }
   *
   * Response: 201 Created
   * WorkspaceMember object with user details
   *
   * Errors:
   * - 400: User not found
   * - 403: Not authorized to invite
   * - 409: User already member
   */
  static addMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check permissions
    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER && role !== WorkspaceMemberRole.ADMIN) {
      throw new ForbiddenError('Only owner or admin can add members');
    }

    const member = await WorkspaceService.addWorkspaceMember(id, userId, req.body);

    if (member) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const targetUserName = member.user?.name || member.userId;
      const payload = makeNotif(uuidv4(), 'member_added', 'Member Added',
        `${actor.name} added ${targetUserName} to workspace`,
        actor, undefined, undefined, id);
      io.to(`user:${member.userId}`).emit('notification', payload);
      io.to(`workspace:${id}`).emit('member:added', { member });
    }

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member added',
      timestamp: new Date(),
    });
  });

  /**
   * GET /workspaces/:id/members
   * List workspace members with pagination
   *
   * Query params:
   * - page: number (default 1)
   * - limit: number (default 20)
   *
   * Response: 200 OK
   * Paginated list of members with user info
   */
  static getMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify user is member
    const hasAccess = await WorkspaceService.canAccessWorkspace(id, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WorkspaceService.getWorkspaceMembers(id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  });

  /**
   * PATCH /workspaces/:id/members/:memberId
   * Update member role
   *
   * Only OWNER can change roles.
   *
   * Request body:
   * {
   *   role: WorkspaceMemberRole (OWNER/ADMIN/MEMBER/GUEST)
   * }
   *
   * Response: 200 OK
   * Updated member object
   *
   * Errors:
   * - 403: Not owner
   * - 404: Member not found
   */
  static updateMemberRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id, memberId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check permissions - owner only
    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can change member roles');
    }

    const member = await WorkspaceService.updateWorkspaceMemberRole(id, userId, memberId, req.body);

    res.status(200).json({
      success: true,
      data: member,
      message: 'Member role updated',
      timestamp: new Date(),
    });
  });

  /**
   * DELETE /workspaces/:id/members/:memberId
   * Remove member from workspace
   *
   * Only OWNER can remove members. Cannot remove owner.
   *
   * Response: 204 No Content
   *
   * Errors:
   * - 403: Not owner or cannot remove owner
   * - 404: Member not found
   */
  static removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id, memberId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check permissions - owner only
    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can remove members');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: memberId }, select: { name: true } });

    await WorkspaceService.removeWorkspaceMember(id, userId, memberId);

    if (targetUser) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const payload = makeNotif(uuidv4(), 'member_removed', 'Member Removed',
        `${actor.name} removed ${targetUser.name} from workspace`,
        actor, undefined, undefined, id);
      io.to(`workspace:${id}`).emit('notification', payload);
      io.to(`workspace:${id}`).emit('member:removed', { memberId });
    }

    res.status(204).send();
  });

  /**
   * POST /workspaces/:id/leave
   * Leave workspace
   *
   * Member leaves workspace. Owner cannot leave.
   *
   * Response: 204 No Content
   *
   * Errors:
   * - 403: Cannot remove owner
   * - 404: Workspace not found
   */
  static leaveWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await WorkspaceService.leaveWorkspace(id, userId);

    res.status(204).send();
  });
}

