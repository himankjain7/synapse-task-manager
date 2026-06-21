"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentService = void 0;
const db_1 = __importDefault(require("../config/db"));
const project_service_1 = require("./project.service");
const activity_service_1 = require("./activity.service");
class AttachmentService {
    static async upload(taskId, userId, file) {
        const task = await db_1.default.task.findUnique({ where: { id: taskId }, include: { project: true } });
        if (!task)
            throw new Error('Task not found');
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess)
            throw new Error('Access denied');
        const attachment = await db_1.default.attachment.create({
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
        await activity_service_1.ActivityService.log({
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
    static async list(taskId, userId) {
        const task = await db_1.default.task.findUnique({ where: { id: taskId }, include: { project: true } });
        if (!task)
            throw new Error('Task not found');
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess)
            throw new Error('Access denied');
        const attachments = await db_1.default.attachment.findMany({
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
    static async delete(attachmentId, userId) {
        const attachment = await db_1.default.attachment.findUnique({ where: { id: attachmentId } });
        if (!attachment)
            throw new Error('Attachment not found');
        if (attachment.uploadedBy !== userId)
            throw new Error('Permission denied');
        const task = await db_1.default.task.findUnique({
            where: { id: attachment.taskId },
            include: { project: true },
        });
        if (task) {
            await activity_service_1.ActivityService.log({
                workspaceId: task.project.workspaceId,
                taskId: attachment.taskId,
                userId,
                action: 'attachment_deleted',
                details: { fileName: attachment.fileName },
            });
        }
        await db_1.default.attachment.delete({ where: { id: attachmentId } });
    }
}
exports.AttachmentService = AttachmentService;
