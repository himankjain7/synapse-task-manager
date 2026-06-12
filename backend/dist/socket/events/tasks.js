"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitTaskCreated = emitTaskCreated;
exports.emitTaskUpdated = emitTaskUpdated;
exports.emitTaskAssigned = emitTaskAssigned;
exports.emitTaskStatusChanged = emitTaskStatusChanged;
exports.emitTaskDeleted = emitTaskDeleted;
exports.emitCommentAdded = emitCommentAdded;
exports.ioInstance = ioInstance;
const index_1 = require("../index");
const db_1 = __importDefault(require("../../config/db"));
/**
 * Helper: write an activity log entry and return created record
 */
async function writeActivityLog(workspaceId, userId, action, details) {
    try {
        const entry = await db_1.default.activityLog.create({
            data: {
                workspaceId,
                userId,
                action,
                details,
            },
        });
        return entry;
    }
    catch (err) {
        // Log but don't fail the emit
        console.error('[ActivityLog] failed to write', err);
        return null;
    }
}
/**
 * Emit `task:created` to project and workspace rooms.
 * - Broadcasts to `project:{projectId}` and `workspace:{workspaceId}`
 * - Persists an activity log entry
 */
async function emitTaskCreated(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    // Broadcast to rooms
    (0, index_1.broadcast)(roomProject, 'task:created', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'task:created', payload);
    // Persist activity
    await writeActivityLog(workspaceId, payload.createdBy.id, 'task.created', {
        taskId: payload.task.id,
        title: payload.task.title,
    });
}
/**
 * Emit `task:updated` with change delta and updated timestamp
 */
async function emitTaskUpdated(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    (0, index_1.broadcast)(roomProject, 'task:updated', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'task:updated', payload);
    await writeActivityLog(workspaceId, payload.updatedBy.id, 'task.updated', {
        taskId: payload.taskId,
        changes: payload.changes,
        updatedAt: payload.updatedAt,
    });
}
/**
 * Emit `task:assigned` when assignee changes
 */
async function emitTaskAssigned(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    (0, index_1.broadcast)(roomProject, 'task:assigned', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'task:assigned', payload);
    await writeActivityLog(workspaceId, payload.assignedBy.id, 'task.assigned', {
        taskId: payload.taskId,
        assignedTo: payload.assignedTo.id,
        assignedAt: payload.assignedAt,
    });
}
/**
 * Emit `task:statusChanged` when status changes
 */
async function emitTaskStatusChanged(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    (0, index_1.broadcast)(roomProject, 'task:statusChanged', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'task:statusChanged', payload);
    await writeActivityLog(workspaceId, payload.changedBy.id, 'task.status_changed', {
        taskId: payload.taskId,
        from: payload.oldStatus,
        to: payload.newStatus,
    });
}
/**
 * Emit `task:deleted` when a task is removed
 */
async function emitTaskDeleted(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    (0, index_1.broadcast)(roomProject, 'task:deleted', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'task:deleted', payload);
    await writeActivityLog(workspaceId, payload.deletedBy.id, 'task.deleted', {
        taskId: payload.taskId,
    });
}
/**
 * Emit `comment:added` when a comment is posted on a task. Emits to task's project and workspace.
 */
async function emitCommentAdded(projectId, workspaceId, payload) {
    const roomProject = `project:${projectId}`;
    const roomWorkspace = `workspace:${workspaceId}`;
    (0, index_1.broadcast)(roomProject, 'comment:added', payload);
    if (workspaceId)
        (0, index_1.broadcast)(roomWorkspace, 'comment:added', payload);
    await writeActivityLog(workspaceId, payload.author.id, 'comment.added', {
        taskId: payload.taskId,
        commentId: payload.comment.id,
        text: payload.comment.content?.slice(0, 240) || null,
    });
}
/**
 * Convenience: return the io instance for direct emits (if needed).
 */
function ioInstance() {
    try {
        return (0, index_1.getIo)();
    }
    catch (err) {
        return null;
    }
}
exports.default = {
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskAssigned,
    emitTaskStatusChanged,
    emitTaskDeleted,
    emitCommentAdded,
    ioInstance,
};
