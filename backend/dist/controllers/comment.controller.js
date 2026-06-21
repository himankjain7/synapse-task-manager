"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentController = void 0;
const comment_service_1 = require("../services/comment.service");
const task_service_1 = require("../services/task.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
const notification_1 = require("../utils/notification");
/**
 * Comment Controller
 *
 * Handles HTTP requests for comment operations:
 * - Create/read/update/delete comments on tasks
 * - Get comments for specific task
 * - Get all comments by user
 * - Get activity feed with recent comments
 *
 * All operations require workspace membership and task access.
 */
class CommentController {
    /**
     * POST /tasks/:taskId/comments
     * Create a new comment on a task
     *
     * Request body:
     * {
     *   content: string (required, 1-5000 chars)
     * }
     *
     * Response: 201 Created
     * Comment object with author information
     *
     * Errors:
     * - 400: Invalid input
     * - 404: Task not found
     */
    static createComment = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { taskId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify task exists
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (!task) {
            throw new error_middleware_2.NotFoundError('Task', taskId);
        }
        const data = req.body;
        const comment = await comment_service_1.CommentService.createComment(taskId, userId, data);
        if (comment) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const wsId = task.project?.workspaceId;
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'comment_added', 'New Comment', `${actor.name} commented on "${task.title}"`, actor, taskId, task.projectId, wsId);
            if (task.assignedTo) {
                io.to(`user:${task.assignedTo}`).emit('notification', payload);
                if (task.assignedTo !== userId) {
                    io.to(`user:${userId}`).emit('notification', payload);
                }
            }
            else {
                io.to(`user:${userId}`).emit('notification', payload);
            }
            io.to(`project:${task.projectId}`).emit('comment:added', { comment });
        }
        res.status(201).json({
            success: true,
            data: comment,
            message: 'Comment created',
            timestamp: new Date(),
        });
    });
    /**
     * GET /tasks/:taskId/comments/:id
     * Get single comment details
     *
     * Response: 200 OK
     * Comment object with author information
     */
    static getComment = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const comment = await comment_service_1.CommentService.getCommentById(id);
        if (!comment) {
            throw new error_middleware_2.NotFoundError('Comment', id);
        }
        res.status(200).json({
            success: true,
            data: comment,
            timestamp: new Date(),
        });
    });
    /**
     * GET /tasks/:taskId/comments
     * List comments on a task with pagination
     *
     * Query params:
     * - page: number (default 1)
     * - limit: number (default 20)
     *
     * Response: 200 OK
     * Paginated list of comments (chronological order)
     */
    static listComments = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { taskId } = req.params;
        const result = await comment_service_1.CommentService.getTaskComments(taskId, userId, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /tasks/:taskId/comments/:id
     * Update a comment
     *
     * Only the comment author can edit.
     *
     * Request body:
     * {
     *   content: string (1-5000 chars)
     * }
     *
     * Response: 200 OK
     * Updated comment object
     *
     * Errors:
     * - 403: Not comment author
     * - 404: Comment not found
     */
    static updateComment = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check if user can edit this comment
        const canEdit = await comment_service_1.CommentService.canEditComment(id, userId);
        if (!canEdit) {
            throw new error_middleware_2.ForbiddenError('You can only edit your own comments');
        }
        // Get task context for notification before returning
        const commentData = await db_1.default.comment.findUnique({ where: { id }, select: { taskId: true } });
        let taskInfo = null;
        if (commentData) {
            const t = await task_service_1.TaskService.getTaskById(commentData.taskId);
            if (t) {
                taskInfo = { title: t.title, projectId: t.projectId, assignedTo: t.assignedTo, project: t.project ? { workspaceId: t.project.workspaceId } : null };
            }
        }
        const data = req.body;
        const comment = await comment_service_1.CommentService.updateComment(id, userId, data);
        if (taskInfo) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'comment_updated', 'Comment Updated', `${actor.name} updated a comment on "${taskInfo.title}"`, actor, commentData?.taskId, taskInfo.projectId, taskInfo.project?.workspaceId);
            if (taskInfo.assignedTo) {
                io.to(`user:${taskInfo.assignedTo}`).emit('notification', payload);
                if (taskInfo.assignedTo !== userId) {
                    io.to(`user:${userId}`).emit('notification', payload);
                }
            }
            else {
                io.to(`user:${userId}`).emit('notification', payload);
            }
        }
        res.status(200).json({
            success: true,
            data: comment,
            message: 'Comment updated',
            timestamp: new Date(),
        });
    });
    /**
     * DELETE /tasks/:taskId/comments/:id
     * Delete a comment
     *
     * Only the comment author can delete.
     *
     * Response: 204 No Content
     *
     * Errors:
     * - 403: Not comment author
     * - 404: Comment not found
     */
    static deleteComment = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check if user can delete this comment
        const canEdit = await comment_service_1.CommentService.canEditComment(id, userId);
        if (!canEdit) {
            throw new error_middleware_2.ForbiddenError('You can only delete your own comments');
        }
        // Fetch comment + task for notification before deletion
        const commentData = await db_1.default.comment.findUnique({ where: { id }, select: { taskId: true, content: true } });
        let taskInfo = null;
        if (commentData) {
            const t = await task_service_1.TaskService.getTaskById(commentData.taskId);
            if (t) {
                taskInfo = { title: t.title, projectId: t.projectId, assignedTo: t.assignedTo, project: t.project ? { workspaceId: t.project.workspaceId } : null };
            }
        }
        await comment_service_1.CommentService.deleteComment(id, userId);
        if (taskInfo) {
            const io = (0, socket_1.getIo)();
            const actor = await (0, notification_1.getUserInfo)(userId);
            const payload = (0, notification_1.makeNotif)((0, uuid_1.v4)(), 'comment_deleted', 'Comment Deleted', `${actor.name} deleted a comment on "${taskInfo.title}"`, actor, commentData?.taskId, taskInfo.projectId, taskInfo.project?.workspaceId);
            if (taskInfo.assignedTo) {
                io.to(`user:${taskInfo.assignedTo}`).emit('notification', payload);
                if (taskInfo.assignedTo !== userId) {
                    io.to(`user:${userId}`).emit('notification', payload);
                }
            }
            else {
                io.to(`user:${userId}`).emit('notification', payload);
            }
        }
        res.status(204).send();
    });
    /**
     * GET /comments/my
     * Get all comments by current user with pagination
     *
     * Query params:
     * - page: number (default 1)
     * - limit: number (default 20)
     *
     * Response: 200 OK
     * Paginated list of user's comments
     */
    static getUserComments = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await comment_service_1.CommentService.getUserComments(userId, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces/:workspaceId/activity
     * Get recent comments activity feed for a workspace
     *
     * Query params:
     * - limit: number (default 20, max 50)
     *
     * Response: 200 OK
     * List of recent comments with task and project context
     */
    static getActivityFeed = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const workspaceId = req.query.workspaceId;
        if (!workspaceId) {
            throw new error_middleware_2.APIError(400, 'VALIDATION_ERROR', 'workspaceId query parameter is required');
        }
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const comments = await comment_service_1.CommentService.getRecentComments(workspaceId, userId, limit);
        res.status(200).json({
            success: true,
            data: comments,
            timestamp: new Date(),
        });
    });
    /**
     * GET /tasks/:taskId/comments/count
     * Get comment count for a task
     *
     * Useful for UI badges.
     *
     * Response: 200 OK
     * {
     *   count: number
     * }
     */
    static getCommentCount = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { taskId } = req.params;
        if (!taskId) {
            throw new error_middleware_2.APIError(400, 'VALIDATION_ERROR', 'taskId query parameter is required');
        }
        const count = await comment_service_1.CommentService.getCommentCount(taskId);
        res.status(200).json({
            success: true,
            data: { count },
            timestamp: new Date(),
        });
    });
}
exports.CommentController = CommentController;
