"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const db_1 = __importDefault(require("../config/db"));
class ActivityService {
    static async log(params) {
        await db_1.default.activityLog.create({
            data: {
                workspaceId: params.workspaceId,
                taskId: params.taskId ?? null,
                userId: params.userId,
                action: params.action,
                details: params.details,
            },
        });
    }
    static async getTaskActivity(taskId) {
        const logs = await db_1.default.activityLog.findMany({
            where: { taskId },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        return logs.map((log) => ({
            id: log.id,
            workspaceId: log.workspaceId,
            taskId: log.taskId,
            userId: log.userId,
            action: log.action,
            details: log.details,
            createdAt: log.createdAt,
            user: {
                id: log.user.id,
                email: log.user.email,
                name: log.user.name,
                avatarUrl: log.user.avatarUrl,
                createdAt: log.user.createdAt,
                updatedAt: log.user.updatedAt,
            },
        }));
    }
}
exports.ActivityService = ActivityService;
