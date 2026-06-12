"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentController = void 0;
const comment_service_1 = require("../services/comment.service");
const task_service_1 = require("../services/task.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
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
        const { taskId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify task exists
        const task = await task_service_1.TaskService.getTaskById(taskId);
        if (!task) {
            throw new error_middleware_2.NotFoundError('Task', taskId);
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
        const data = req.body;
        const comment = await comment_service_1.CommentService.updateComment(id, userId, data);
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
        await comment_service_1.CommentService.deleteComment(id, userId);
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
        const { workspaceId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
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
        const count = await comment_service_1.CommentService.getCommentCount(taskId);
        res.status(200).json({
            success: true,
            data: { count },
            timestamp: new Date(),
        });
    });
}
exports.CommentController = CommentController;
