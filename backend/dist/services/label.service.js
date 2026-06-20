"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelService = void 0;
const db_1 = __importDefault(require("../config/db"));
const activity_service_1 = require("./activity.service");
class LabelService {
    static async getProjectLabels(projectId) {
        return db_1.default.taskLabel.findMany({
            where: { projectId },
            orderBy: { name: 'asc' },
        });
    }
    static async createLabel(projectId, name, color) {
        return db_1.default.taskLabel.create({
            data: { projectId, name, color },
        });
    }
    static async updateLabel(id, name, color) {
        return db_1.default.taskLabel.update({
            where: { id },
            data: { name, color },
        });
    }
    static async deleteLabel(id) {
        await db_1.default.taskLabelAssignment.deleteMany({ where: { labelId: id } });
        await db_1.default.taskLabel.delete({ where: { id } });
    }
    static async assignLabelToTask(taskId, labelId, userId) {
        const [task, label] = await Promise.all([
            db_1.default.task.findUnique({ where: { id: taskId }, include: { project: true } }),
            db_1.default.taskLabel.findUnique({ where: { id: labelId } }),
        ]);
        const assignment = await db_1.default.taskLabelAssignment.create({
            data: { taskId, labelId },
        });
        if (task && label) {
            await activity_service_1.ActivityService.log({
                workspaceId: task.project.workspaceId,
                taskId,
                userId,
                action: 'label_added',
                details: { label: label.name },
            });
        }
        return assignment;
    }
    static async removeLabelFromTask(taskId, labelId, userId) {
        const [task, label] = await Promise.all([
            db_1.default.task.findUnique({ where: { id: taskId }, include: { project: true } }),
            db_1.default.taskLabel.findUnique({ where: { id: labelId } }),
        ]);
        await db_1.default.taskLabelAssignment.deleteMany({
            where: { taskId, labelId },
        });
        if (task && label) {
            await activity_service_1.ActivityService.log({
                workspaceId: task.project.workspaceId,
                taskId,
                userId,
                action: 'label_removed',
                details: { label: label.name },
            });
        }
    }
    static async getTaskLabels(taskId) {
        const assignments = await db_1.default.taskLabelAssignment.findMany({
            where: { taskId },
            include: { label: true },
        });
        return assignments.map(a => a.label);
    }
}
exports.LabelService = LabelService;
