"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelService = void 0;
const db_1 = __importDefault(require("../config/db"));
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
    static async assignLabelToTask(taskId, labelId) {
        return db_1.default.taskLabelAssignment.create({
            data: { taskId, labelId },
        });
    }
    static async removeLabelFromTask(taskId, labelId) {
        await db_1.default.taskLabelAssignment.deleteMany({
            where: { taskId, labelId },
        });
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
