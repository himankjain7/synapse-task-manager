import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceMemberRole } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class WorkspaceController {
  static createWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: CreateWorkspaceRequest = req.body;
    const workspace = await WorkspaceService.createWorkspace(userId, data);

    if (workspace) {
      await NotificationService.notify({
        recipientId: userId, actorId: userId,
        type: 'workspace_created', title: 'Workspace Created',
        message: `created workspace "${workspace.name}"`,
        workspaceId: workspace.id,
        skipSelf: false,
      });
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`workspace:${workspace.id}`).emit('workspace:created', { workspace });
      }, 'socket:workspace:created');
    }

    sendSuccess(res, workspace, 201);
  });

  static getWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const hasAccess = await WorkspaceService.canAccessWorkspace(id, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const workspace = await WorkspaceService.getWorkspaceById(id);
    if (!workspace) {
      throw new NotFoundError('Workspace', id);
    }

    sendSuccess(res, workspace);
  });

  static listWorkspaces = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WorkspaceService.getUserWorkspaces(userId, page, limit);

    sendSuccess(res, result);
  });

  static updateWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER && role !== WorkspaceMemberRole.ADMIN) {
      throw new ForbiddenError('Only owner or admin can update workspace');
    }

    const data: UpdateWorkspaceRequest = req.body;
    const workspace = await WorkspaceService.updateWorkspace(id, userId, data);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      select: { userId: true },
    });
    for (const m of members) {
      await NotificationService.notify({
        recipientId: m.userId, actorId: userId,
        type: 'workspace_updated', title: 'Workspace Updated',
        message: `updated workspace "${workspace.name}"`,
        workspaceId: id,
      });
    }

    sendSuccess(res, workspace);
  });

  static deleteWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can delete workspace');
    }

    await WorkspaceService.deleteWorkspace(id, userId);

    res.status(204).send();
  });

  static addMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER && role !== WorkspaceMemberRole.ADMIN) {
      throw new ForbiddenError('Only owner or admin can add members');
    }

    const member = await WorkspaceService.addWorkspaceMember(id, userId, req.body);

    if (member) {
      await NotificationService.notify({
        recipientId: member.userId, actorId: userId,
        type: 'member_added', title: 'Member Added',
        message: `added you to workspace`,
        workspaceId: id,
      });
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`workspace:${id}`).emit('member:added', { member });
      }, 'socket:member:added');
    }

    sendSuccess(res, member, 201);
  });

  static getMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const hasAccess = await WorkspaceService.canAccessWorkspace(id, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WorkspaceService.getWorkspaceMembers(id, page, limit);

    sendSuccess(res, result);
  });

  static updateMemberRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id, memberId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can change member roles');
    }

    const member = await WorkspaceService.updateWorkspaceMemberRole(id, userId, memberId, req.body);

    await NotificationService.notify({
      recipientId: memberId, actorId: userId,
      type: 'role_changed', title: 'Role Changed',
      message: `changed your role to ${member.role}`,
      workspaceId: id,
    });

    sendSuccess(res, member);
  });

  static removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id, memberId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const role = await WorkspaceService.getUserRoleInWorkspace(id, userId);
    if (role !== WorkspaceMemberRole.OWNER) {
      throw new ForbiddenError('Only owner can remove members');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: memberId }, select: { name: true } });

    await WorkspaceService.removeWorkspaceMember(id, userId, memberId);

    if (targetUser) {
      await NotificationService.notify({
        recipientId: memberId, actorId: userId,
        type: 'member_removed', title: 'Member Removed',
        message: `removed you from workspace`,
        workspaceId: id,
      });
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`workspace:${id}`).emit('member:removed', { memberId });
      }, 'socket:member:removed');
    }

    res.status(204).send();
  });

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
