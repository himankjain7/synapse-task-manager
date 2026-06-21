import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';
import prisma from '../config/db';
import { getIo } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { makeNotif, getUserInfo } from '../utils/notification';

export class AttachmentController {
  static upload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    if (!req.file) throw new APIError(400, 'VALIDATION_ERROR', 'No file provided');
    const attachment = await AttachmentService.upload(taskId, userId, req.file);

    if (attachment) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, projectId: true, assignedTo: true } });
      if (task) {
        const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
        const payload = makeNotif(uuidv4(), 'attachment_uploaded', 'File Uploaded',
          `${actor.name} uploaded "${attachment.fileName}" to "${task.title}"`,
          actor, taskId, task.projectId, project?.workspaceId);
        if (task.assignedTo) {
          io.to(`user:${task.assignedTo}`).emit('notification', payload);
        }
        io.to(`project:${task.projectId}`).emit('attachment:uploaded', { attachment });
      }
    }

    res.status(201).json({ success: true, data: attachment, timestamp: new Date() });
  });

  static list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const attachments = await AttachmentService.list(taskId, userId);
    res.status(200).json({ success: true, data: attachments, timestamp: new Date() });
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
      const io = getIo();
      const actor = await getUserInfo(userId);
      const payload = makeNotif(uuidv4(), 'attachment_deleted', 'File Deleted',
        `${actor.name} deleted "${attachInfo.fileName}"`,
        actor, attachInfo.taskId, attachInfo.task.projectId, project?.workspaceId);
      if (attachInfo.task.assignedTo) {
        io.to(`user:${attachInfo.task.assignedTo}`).emit('notification', payload);
      }
      io.to(`project:${attachInfo.task.projectId}`).emit('attachment:deleted', { attachmentId: id });
    }

    res.status(204).send();
  });
}
