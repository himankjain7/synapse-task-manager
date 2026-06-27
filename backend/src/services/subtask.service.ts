import prisma from '../config/db';
import { ActivityService } from './activity.service';
import { AuthzService } from './authz.service';
import { NotFoundError } from '../middleware/error.middleware';

export interface SubtaskResponse {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubtaskRequest {
  title: string;
}

export interface UpdateSubtaskRequest {
  title?: string;
  completed?: boolean;
  position?: number;
}

export class SubtaskService {
  static async list(taskId: string, userId: string): Promise<SubtaskResponse[]> {
    await AuthzService.requireTaskAccess(taskId, userId);
    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
    return subtasks.map(s => ({
      id: s.id,
      taskId: s.taskId,
      title: s.title,
      completed: s.completed,
      position: s.position,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  static async create(taskId: string, userId: string, data: CreateSubtaskRequest): Promise<SubtaskResponse> {
    await AuthzService.requireTaskAccess(taskId, userId);
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundError('Task not found');
    if (!task.project) throw new NotFoundError('Project not found');

    const maxPos = await prisma.subtask.aggregate({ where: { taskId }, _max: { position: true } });
    const position = (maxPos._max.position ?? -1) + 1;

    const subtask = await prisma.subtask.create({
      data: { taskId, title: data.title.trim(), position },
    });

    await ActivityService.log({
      workspaceId: task.project.workspaceId,
      taskId,
      userId,
      action: 'subtask_created',
      details: { title: subtask.title },
    });

    return {
      id: subtask.id,
      taskId: subtask.taskId,
      title: subtask.title,
      completed: subtask.completed,
      position: subtask.position,
      createdAt: subtask.createdAt.toISOString(),
      updatedAt: subtask.updatedAt.toISOString(),
    };
  }

  static async update(subtaskId: string, userId: string, data: UpdateSubtaskRequest): Promise<SubtaskResponse> {
    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId }, include: { task: { include: { project: true } } } });
    if (!existing) throw new NotFoundError('Subtask not found');
    await AuthzService.requireTaskAccess(existing.taskId, userId);

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.completed !== undefined && { completed: data.completed }),
        ...(data.position !== undefined && { position: data.position }),
        updatedAt: new Date(),
      },
    });

    if (data.completed !== undefined && existing.task.project) {
      await ActivityService.log({
        workspaceId: existing.task.project.workspaceId,
        taskId: existing.taskId,
        userId,
        action: data.completed ? 'subtask_completed' : 'subtask_uncompleted',
        details: { title: subtask.title },
      });
    }

    return {
      id: subtask.id,
      taskId: subtask.taskId,
      title: subtask.title,
      completed: subtask.completed,
      position: subtask.position,
      createdAt: subtask.createdAt.toISOString(),
      updatedAt: subtask.updatedAt.toISOString(),
    };
  }

  static async delete(subtaskId: string, userId: string): Promise<void> {
    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId }, include: { task: { include: { project: true } } } });
    if (!existing) throw new NotFoundError('Subtask not found');
    await AuthzService.requireTaskAccess(existing.taskId, userId);

    await prisma.subtask.delete({ where: { id: subtaskId } });

    if (existing.task.project) {
      await ActivityService.log({
        workspaceId: existing.task.project.workspaceId,
        taskId: existing.taskId,
        userId,
        action: 'subtask_deleted',
        details: { title: existing.title },
      });
    }
  }
}
