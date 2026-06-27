import { Request, Response } from 'express';
import { asyncHandler, APIError } from '../middleware/error.middleware';
import { SubtaskService } from '../services/subtask.service';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class SubtaskController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { taskId } = req.params;
    const data = await SubtaskService.list(taskId, userId);
    sendSuccess(res, data);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { taskId } = req.params;
    const data = await SubtaskService.create(taskId, userId, req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, assignedTo: true, project: { select: { workspaceId: true } } } });
    if (task) {
      if (task.assignedTo) {
        await NotificationService.notify({
          recipientId: task.assignedTo, actorId: userId,
          type: 'subtask_added', title: 'Subtask Added',
          message: `added subtask "${data.title}"`,
          taskId, projectId: task.projectId, workspaceId: task.project?.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('subtask:created', { taskId, subtask: data });
      }, 'socket:subtask:created');
    }

    sendSuccess(res, data, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { subtaskId } = req.params;
    const data = await SubtaskService.update(subtaskId, userId, req.body);

    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId }, include: { task: { include: { project: true } } } });
    if (existing) {
      if (data.completed !== undefined && existing.task.assignedTo) {
        await NotificationService.notify({
          recipientId: existing.task.assignedTo, actorId: userId,
          type: data.completed ? 'subtask_completed' : 'subtask_uncompleted',
          title: data.completed ? 'Subtask Completed' : 'Subtask Uncompleted',
          message: `${data.completed ? 'completed' : 'uncompleted'} subtask "${data.title}"`,
          taskId: existing.taskId, projectId: existing.task.projectId, workspaceId: existing.task.project?.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${existing.task.projectId}`).emit('subtask:updated', { taskId: existing.taskId, subtask: data });
      }, 'socket:subtask:updated');
    }

    sendSuccess(res, data);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { subtaskId } = req.params;
    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId }, include: { task: { include: { project: true } } } });

    await SubtaskService.delete(subtaskId, userId);

    if (existing) {
      if (existing.task.assignedTo) {
        await NotificationService.notify({
          recipientId: existing.task.assignedTo, actorId: userId,
          type: 'subtask_deleted', title: 'Subtask Deleted',
          message: `deleted subtask "${existing.title}"`,
          taskId: existing.taskId, projectId: existing.task.projectId, workspaceId: existing.task.project?.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${existing.task.projectId}`).emit('subtask:deleted', { taskId: existing.taskId, subtaskId });
      }, 'socket:subtask:deleted');
    }

    res.status(204).send();
  });
}
