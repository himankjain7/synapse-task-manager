"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelController = void 0;
const label_service_1 = require("../services/label.service");
const task_service_1 = require("../services/task.service");
const error_middleware_1 = require("../middleware/error.middleware");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
const notification_1 = require("../utils/notification");
class LabelController {
    static listLabels = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const labels = await label_service_1.LabelService.getProjectLabels(projectId);
        res.json({ success: true, data: labels, timestamp: new Date() });
    });
    static createLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const { name, color } = req.body;
        const label = await label_service_1.LabelService.createLabel(projectId, name, color || '#6366F1');
        res.status(201).json({ success: true, data: label, timestamp: new Date() });
    });
    static updateLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { name, color } = req.body;
        const label = await label_service_1.LabelService.updateLabel(id, name, color);
        res.json({ success: true, data: label, timestamp: new Date() });
    });
    static deleteLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        await label_service_1.LabelService.deleteLabel(id);
        res.status(204).send();
    });
    static assignLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId)
            throw new error_middleware_1.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const { taskId } = req.params;
        const { labelId } = req.body;
        await label_service_1.LabelService.assignLabelToTask(taskId, labelId, userId);
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (task) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const wsId = task.project?.workspaceId;
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'label_added', 'Label Added', `${actor.name} added a label to "${task.title}"`, actor, taskId, task.projectId, wsId);
            if (task.assignedTo) {
                io.to(`user:${task.assignedTo}`).emit('notification', payload);
                if (task.assignedTo !== userId) {
                    io.to(`user:${userId}`).emit('notification', payload);
                }
            }
            else {
                io.to(`user:${userId}`).emit('notification', payload);
            }
        }
        res.json({ success: true, message: 'Label assigned', timestamp: new Date() });
    });
    static removeLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId)
            throw new error_middleware_1.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const { taskId, labelId } = req.params;
        await label_service_1.LabelService.removeLabelFromTask(taskId, labelId, userId);
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (task) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const wsId = task.project?.workspaceId;
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'label_removed', 'Label Removed', `${actor.name} removed a label from "${task.title}"`, actor, taskId, task.projectId, wsId);
            if (task.assignedTo) {
                io.to(`user:${task.assignedTo}`).emit('notification', payload);
                if (task.assignedTo !== userId) {
                    io.to(`user:${userId}`).emit('notification', payload);
                }
            }
            else {
                io.to(`user:${userId}`).emit('notification', payload);
            }
        }
        res.json({ success: true, message: 'Label removed', timestamp: new Date() });
    });
}
exports.LabelController = LabelController;
