import prisma from '../config/db';
import { ProjectService } from './project.service';
import { ActivityService } from './activity.service';

export interface AttachmentResponse {
  id: string;
  taskId: string;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export class AttachmentService {
  static async upload(taskId: string, userId: string, file: Express.Multer.File): Promise<AttachmentResponse> {
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new Error('Task not found');
    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) throw new Error('Access denied');

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      },
      include: { uploader: { select: { name: true } } },
    });

    await ActivityService.log({
      workspaceId: task.project.workspaceId,
      taskId,
      userId,
      action: 'attachment_uploaded',
      details: { fileName: file.originalname, fileUrl: `/uploads/${file.filename}` },
    });

    return {
      id: attachment.id,
      taskId: attachment.taskId,
      uploadedBy: attachment.uploadedBy,
      uploaderName: attachment.uploader.name,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
    };
  }

  static async list(taskId: string, userId: string): Promise<AttachmentResponse[]> {
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new Error('Task not found');
    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) throw new Error('Access denied');

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { name: true } } },
    });

    return attachments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      uploadedBy: a.uploadedBy,
      uploaderName: a.uploader.name,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt,
    }));
  }

  static async delete(attachmentId: string, userId: string): Promise<void> {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new Error('Attachment not found');
    if (attachment.uploadedBy !== userId) throw new Error('Permission denied');

    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
      include: { project: true },
    });
    if (task) {
      await ActivityService.log({
        workspaceId: task.project.workspaceId,
        taskId: attachment.taskId,
        userId,
        action: 'attachment_deleted',
        details: { fileName: attachment.fileName },
      });
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
