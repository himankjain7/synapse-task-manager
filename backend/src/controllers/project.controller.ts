import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { WorkspaceService } from '../services/workspace.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { AuthzService } from '../services/authz.service';
import { CreateProjectRequest, UpdateProjectRequest, ProjectStatus } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class ProjectController {
  static createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const isMember = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const data: CreateProjectRequest = req.body;
    const project = await ProjectService.createProject(workspaceId, userId, data);

    if (project) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      for (const m of members) {
        await NotificationService.notify({
          recipientId: m.userId, actorId: userId,
          type: 'project_created', title: 'Project Created',
          message: `created project "${project.name}"`,
          projectId: project.id, workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`workspace:${workspaceId}`).emit('project:created', { project });
      }, 'socket:project:created');
    }

    sendSuccess(res, project, 201);
  });

  static getProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const canAccess = await ProjectService.canAccessProject(id, userId);
    if (!canAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }

    sendSuccess(res, project);
  });

  static listProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const { workspaceId } = req.params;
  const status = req.query.status as ProjectStatus | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await ProjectService.getUserProjects(
    userId,
    status,
    page,
    limit,
    workspaceId
  );

  sendSuccess(res, result);
});

  static updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: UpdateProjectRequest = req.body;
    const project = await ProjectService.updateProject(id, userId, data);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: project.workspaceId },
      select: { userId: true },
    });
    for (const m of members) {
      await NotificationService.notify({
        recipientId: m.userId, actorId: userId,
        type: 'project_updated', title: 'Project Updated',
        message: `updated project "${project.name}"`,
        projectId: project.id, workspaceId: project.workspaceId,
      });
    }

    sendSuccess(res, project);
  });

  static archiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const project = await ProjectService.archiveProject(id, userId);

    if (project) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: project.workspaceId },
        select: { userId: true },
      });
      for (const m of members) {
        await NotificationService.notify({
          recipientId: m.userId, actorId: userId,
          type: 'project_archived', title: 'Project Archived',
          message: `archived project "${project.name}"`,
          projectId: project.id, workspaceId: project.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${project.id}`).emit('project:archived', { project });
      }, 'socket:project:archived');
    }

    sendSuccess(res, project);
  });

  static unarchiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const project = await ProjectService.unarchiveProject(id, userId);

    if (project) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: project.workspaceId },
        select: { userId: true },
      });
      for (const m of members) {
        await NotificationService.notify({
          recipientId: m.userId, actorId: userId,
          type: 'project_unarchived', title: 'Project Unarchived',
          message: `unarchived project "${project.name}"`,
          projectId: project.id, workspaceId: project.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${project.id}`).emit('project:unarchived', { project });
      }, 'socket:project:unarchived');
    }

    sendSuccess(res, project);
  });

  static deleteProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await ProjectService.deleteProject(id, userId);

    res.status(204).send();
  });

  static getProjectStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await AuthzService.requireProjectAccess(id, userId);
    const stats = await ProjectService.getProjectStats(id);

    sendSuccess(res, stats);
  });
}
