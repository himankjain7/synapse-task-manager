import { Request, Response } from 'express';
import { LabelService } from '../services/label.service';
import { TaskService } from '../services/task.service';
import { asyncHandler, APIError } from '../middleware/error.middleware';
import { getIo } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { makeNotif, getUserInfo } from '../utils/notification';

export class LabelController {
  static listLabels = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const labels = await LabelService.getProjectLabels(projectId);
    res.json({ success: true, data: labels, timestamp: new Date() });
  });

  static createLabel = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.createLabel(projectId, name, color || '#6366F1');
    res.status(201).json({ success: true, data: label, timestamp: new Date() });
  });

  static updateLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.updateLabel(id, name, color);
    res.json({ success: true, data: label, timestamp: new Date() });
  });

  static deleteLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await LabelService.deleteLabel(id);
    res.status(204).send();
  });

  static assignLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { taskId } = req.params;
    const { labelId } = req.body;
    await LabelService.assignLabelToTask(taskId, labelId, userId);
    const task = await TaskService.getTaskById(taskId);
    if (task) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const wsId = task.project?.workspaceId;
      const payload = makeNotif(uuidv4(), 'label_added', 'Label Added',
        `${actor.name} added a label to "${task.title}"`,
        actor, taskId, task.projectId, wsId);
      if (task.assignedTo) {
        io.to(`user:${task.assignedTo}`).emit('notification', payload);
        if (task.assignedTo !== userId) {
          io.to(`user:${userId}`).emit('notification', payload);
        }
      } else {
        io.to(`user:${userId}`).emit('notification', payload);
      }
      io.to(`project:${task.projectId}`).emit('task:updated', { task });
    }
    res.json({ success: true, message: 'Label assigned', timestamp: new Date() });
  });

  static removeLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { taskId, labelId } = req.params;
    await LabelService.removeLabelFromTask(taskId, labelId, userId);
    const task = await TaskService.getTaskById(taskId);
    if (task) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const wsId = task.project?.workspaceId;
      const payload = makeNotif(uuidv4(), 'label_removed', 'Label Removed',
        `${actor.name} removed a label from "${task.title}"`,
        actor, taskId, task.projectId, wsId);
      if (task.assignedTo) {
        io.to(`user:${task.assignedTo}`).emit('notification', payload);
        if (task.assignedTo !== userId) {
          io.to(`user:${userId}`).emit('notification', payload);
        }
      } else {
        io.to(`user:${userId}`).emit('notification', payload);
      }
      io.to(`project:${task.projectId}`).emit('task:updated', { task });
    }
    res.json({ success: true, message: 'Label removed', timestamp: new Date() });
  });
}
