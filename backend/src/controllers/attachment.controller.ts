import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class AttachmentController {
  static upload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    if (!req.file) throw new APIError(400, 'VALIDATION_ERROR', 'No file provided');
    const attachment = await AttachmentService.upload(taskId, userId, req.file);

    if (attachment) {
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, projectId: true, assignedTo: true } });
      if (task) {
        const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
        if (task.assignedTo) {
          await NotificationService.notify({
            recipientId: task.assignedTo, actorId: userId,
            type: 'attachment_uploaded', title: 'File Uploaded',
            message: `uploaded "${attachment.fileName}" to "${task.title}"`,
            taskId, projectId: task.projectId, workspaceId: project?.workspaceId,
          });
        }
        await safeSideEffect(async () => {
          const io = getIo();
          io.to(`project:${task.projectId}`).emit('attachment:uploaded', { attachment });
        }, 'socket:attachment:uploaded');
      }
    }

    sendSuccess(res, attachment, 201);
  });

  static list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const attachments = await AttachmentService.list(taskId, userId);
    sendSuccess(res, attachments);
  });

  static delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    const attachInfo = await prisma.attachment.findUnique({
      where: { id },
      include: { task: { select: { title: true, projectId: true, assignedTo: true } } },
    });

    await AttachmentService.delete(id, userId);

    if (attachInfo && attachInfo.task) {
      const project = await prisma.project.findUnique({ where: { id: attachInfo.task.projectId }, select: { workspaceId: true } });
      if (attachInfo.task.assignedTo) {
        await NotificationService.notify({
          recipientId: attachInfo.task.assignedTo, actorId: userId,
          type: 'attachment_deleted', title: 'File Deleted',
          message: `deleted "${attachInfo.fileName}"`,
          taskId: attachInfo.taskId, projectId: attachInfo.task.projectId, workspaceId: project?.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${attachInfo.task.projectId}`).emit('attachment:deleted', { attachmentId: id });
      }, 'socket:attachment:deleted');
    }

    res.status(204).send();
  });
}
