import { Request, Response } from 'express';
import { LabelService } from '../services/label.service';
import { TaskService } from '../services/task.service';
import { asyncHandler, APIError } from '../middleware/error.middleware';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class LabelController {
  static listLabels = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { projectId } = req.params;
    const labels = await LabelService.getProjectLabels(projectId, userId);
    sendSuccess(res, labels);
  });

  static createLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { projectId } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.createLabel(projectId, name, color || '#6366F1', userId);
    sendSuccess(res, label, 201);
  });

  static updateLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { id } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.updateLabel(id, name, color, userId);
    sendSuccess(res, label);
  });

  static deleteLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { id } = req.params;
    await LabelService.deleteLabel(id, userId);
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
      const wsId = task.project?.workspaceId;
      if (task.assignedTo) {
        await NotificationService.notify({
          recipientId: task.assignedTo, actorId: userId,
          type: 'label_added', title: 'Label Added',
          message: `added a label to "${task.title}"`,
          taskId, projectId: task.projectId, workspaceId: wsId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('task:updated', { task });
      }, 'socket:task:updated');
    }
    sendSuccess(res, { message: 'Label assigned' });
  });

  static removeLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const { taskId, labelId } = req.params;
    await LabelService.removeLabelFromTask(taskId, labelId, userId);
    const task = await TaskService.getTaskById(taskId);
    if (task) {
      const wsId = task.project?.workspaceId;
      if (task.assignedTo) {
        await NotificationService.notify({
          recipientId: task.assignedTo, actorId: userId,
          type: 'label_removed', title: 'Label Removed',
          message: `removed a label from "${task.title}"`,
          taskId, projectId: task.projectId, workspaceId: wsId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('task:updated', { task });
      }, 'socket:task:updated');
    }
    sendSuccess(res, { message: 'Label removed' });
  });
}
