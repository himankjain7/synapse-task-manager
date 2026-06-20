import prisma from '../config/db';
import { ActivityLogWithUser } from '../models';

export class ActivityService {
  static async log(params: {
    workspaceId: string;
    taskId: string;
    userId: string;
    action: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    await prisma.activityLog.create({
      data: {
        workspaceId: params.workspaceId,
        taskId: params.taskId,
        userId: params.userId,
        action: params.action,
        details: params.details as any,
      },
    });
  }

  static async getTaskActivity(taskId: string): Promise<ActivityLogWithUser[]> {
    const logs = await prisma.activityLog.findMany({
      where: { taskId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      workspaceId: log.workspaceId,
      taskId: log.taskId,
      userId: log.userId,
      action: log.action,
      details: log.details as Record<string, unknown>,
      createdAt: log.createdAt,
      user: {
        id: log.user.id,
        email: log.user.email,
        name: log.user.name,
        avatarUrl: log.user.avatarUrl,
        createdAt: log.user.createdAt,
        updatedAt: log.user.updatedAt,
      },
    })) as unknown as ActivityLogWithUser[];
  }
}
