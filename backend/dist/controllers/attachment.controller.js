"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentController = void 0;
const attachment_service_1 = require("../services/attachment.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
const notification_1 = require("../utils/notification");
class AttachmentController {
    static upload = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { taskId } = req.params;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        if (!req.file)
            throw new error_middleware_2.APIError(400, 'VALIDATION_ERROR', 'No file provided');
        const attachment = await attachment_service_1.AttachmentService.upload(taskId, userId, req.file);
        if (attachment) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const task = await db_1.default.task.findUnique({ where: { id: taskId }, select: { title: true, projectId: true, assignedTo: true } });
            if (task) {
                const project = await db_1.default.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
                const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'attachment_uploaded', 'File Uploaded', `${actor.name} uploaded "${attachment.fileName}" to "${task.title}"`, actor, taskId, task.projectId, project?.workspaceId);
                if (task.assignedTo) {
                    io.to(`user:${task.assignedTo}`).emit('notification', payload);
                }
                io.to(`project:${task.projectId}`).emit('attachment:uploaded', { attachment });
            }
        }
        res.status(201).json({ success: true, data: attachment, timestamp: new Date() });
    });
    static list = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { taskId } = req.params;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const attachments = await attachment_service_1.AttachmentService.list(taskId, userId);
        res.status(200).json({ success: true, data: attachments, timestamp: new Date() });
    });
    static delete = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const attachInfo = await db_1.default.attachment.findUnique({
            where: { id },
            include: { task: { select: { title: true, projectId: true, assignedTo: true } } },
        });
        await attachment_service_1.AttachmentService.delete(id, userId);
        if (attachInfo && attachInfo.task) {
            const project = await db_1.default.project.findUnique({ where: { id: attachInfo.task.projectId }, select: { workspaceId: true } });
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'attachment_deleted', 'File Deleted', `${actor.name} deleted "${attachInfo.fileName}"`, actor, attachInfo.taskId, attachInfo.task.projectId, project?.workspaceId);
            if (attachInfo.task.assignedTo) {
                io.to(`user:${attachInfo.task.assignedTo}`).emit('notification', payload);
            }
            io.to(`project:${attachInfo.task.projectId}`).emit('attachment:deleted', { attachmentId: id });
        }
        res.status(204).send();
    });
}
exports.AttachmentController = AttachmentController;
