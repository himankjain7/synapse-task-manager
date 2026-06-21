"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.makeNotif = void 0;
const db_1 = __importDefault(require("../config/db"));
const makeNotif = (id, type, title, message, actor, taskId, projectId, workspaceId) => ({
    id,
    type,
    title,
    message,
    taskId,
    projectId,
    workspaceId,
    createdAt: new Date().toISOString(),
    read: false,
    actor,
});
exports.makeNotif = makeNotif;
const getUserInfo = async (userId) => {
    const user = await db_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatarUrl: true },
    });
    return {
        id: userId,
        name: user?.name || userId,
        avatar: user?.avatarUrl || null,
    };
};
exports.getUserInfo = getUserInfo;
