import prisma from '../config/db';
import { WorkspaceService } from './workspace.service';
import { ProjectService } from './project.service';
import { ForbiddenError } from '../middleware/error.middleware';
import { WorkspaceMemberRole } from '../models';

export class AuthzService {
  static async requireWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
    const hasAccess = await WorkspaceService.canAccessWorkspace(workspaceId, userId);
    if (!hasAccess) throw new ForbiddenError('You do not have access to this workspace');
  }

  static async requireProjectAccess(projectId: string, userId: string): Promise<void> {
    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) throw new ForbiddenError('You do not have access to this project');
  }

  static async requireTaskAccess(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) throw new ForbiddenError('Task not found');
    await this.requireProjectAccess(task.projectId, userId);
  }

  static async requireWorkspaceRole(workspaceId: string, userId: string, minRole: WorkspaceMemberRole): Promise<void> {
    const hasPermission = await WorkspaceService.hasWorkspacePermission(workspaceId, userId, minRole);
    if (!hasPermission) throw new ForbiddenError('Insufficient permissions');
  }

  static async requireProjectAdmin(projectId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, workspaceId: true },
    });
    if (!project) throw new ForbiddenError('Project not found');
    if (project.ownerId === userId) return;
    await this.requireWorkspaceRole(project.workspaceId, userId, WorkspaceMemberRole.ADMIN);
  }
}
