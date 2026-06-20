"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const db_1 = __importDefault(require("../config/db"));
const project_service_1 = require("./project.service");
const activity_service_1 = require("./activity.service");
/**
 * Comment Business Logic Service
 *
 * Handles all comment operations:
 * - CRUD operations for comments on tasks
 * - Comment threading and discussion
 * - Permission validation (only comment author can edit/delete)
 *
 * Security:
 * - Verifies user is task workspace member before operations
 * - Only comment author can edit or delete own comments
 * - Enforces task-level access control
 */
class CommentService {
    /**
     * Create a new comment on task
     *
     * Any workspace member can comment on tasks.
     * Comment is authored by the creating user.
     *
     * @param taskId - Task ID
     * @param userId - User creating comment
     * @param data - Comment creation data
     * @returns Created comment with user info
     * @throws Error if task not found or access denied
     */
    static async createComment(taskId, userId, data) {
        // Get task
        const task = await db_1.default.task.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new Error('Task not found');
        }
        // Verify user has project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Get commenter user info
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Create comment
        const comment = await db_1.default.comment.create({
            data: {
                taskId,
                userId,
                content: data.content.trim(),
                createdAt: new Date(),
            },
        });
        // Log activity
        const project = await db_1.default.project.findUnique({
            where: { id: task.projectId },
        });
        if (project) {
            await activity_service_1.ActivityService.log({
                workspaceId: project.workspaceId,
                taskId,
                userId,
                action: 'comment_created',
                details: { content: data.content.trim().substring(0, 200) },
            });
        }
        return {
            ...comment,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }
    /**
     * Get comment by ID
     *
     * @param commentId - Comment ID
     * @returns Comment with user info, or null if not found
     */
    static async getCommentById(commentId) {
        const comment = await db_1.default.comment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            return null;
        }
        const user = await db_1.default.user.findUnique({
            where: { id: comment.userId },
        });
        if (!user) {
            throw new Error('Comment author not found');
        }
        return {
            ...comment,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }
    /**
     * Get all comments on task
     *
     * Returns paginated list of comments in chronological order.
     * Any workspace member can view comments.
     *
     * @param taskId - Task ID
     * @param userId - User ID (for permission check)
     * @param page - Pagination page (default: 1)
     * @param limit - Items per page (default: 50)
     * @returns Paginated list of comments with user info
     * @throws Error if task not found or access denied
     */
    static async getTaskComments(taskId, userId, page = 1, limit = 50) {
        // Get task
        const task = await db_1.default.task.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new Error('Task not found');
        }
        // Verify user has project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Get comments
        const comments = await db_1.default.comment.findMany({
            where: { taskId },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'asc' }, // Chronological order
        });
        const total = await db_1.default.comment.count({ where: { taskId } });
        // Enrich with user info
        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const user = await db_1.default.user.findUnique({
                where: { id: comment.userId },
            });
            if (!user) {
                throw new Error(`User ${comment.userId} not found`);
            }
            return {
                ...comment,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            };
        }));
        return {
            data: enrichedComments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update comment
     *
     * Only the comment author can edit their own comments.
     * Marked as updated after edit.
     *
     * @param commentId - Comment ID
     * @param userId - User ID (must be comment author)
     * @param data - Update data
     * @returns Updated comment
     * @throws Error if permission denied or comment not found
     */
    static async updateComment(commentId, userId, data) {
        // Get comment
        const comment = await db_1.default.comment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new Error('Comment not found');
        }
        // Only author can edit
        if (comment.userId !== userId) {
            throw new Error('Permission denied: only comment author can edit');
        }
        // Get user
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Update comment
        const updated = await db_1.default.comment.update({
            where: { id: commentId },
            data: {
                content: data.content.trim(),
                updatedAt: new Date(),
            },
        });
        return {
            ...updated,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }
    /**
     * Delete comment
     *
     * Only the comment author can delete.
     * Deletes comment and removes from discussion.
     *
     * @param commentId - Comment ID
     * @param userId - User ID (must be comment author)
     * @throws Error if permission denied or comment not found
     */
    static async deleteComment(commentId, userId) {
        // Get comment
        const comment = await db_1.default.comment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new Error('Comment not found');
        }
        // Only author can delete
        if (comment.userId !== userId) {
            throw new Error('Permission denied: only comment author can delete');
        }
        // Log activity before deletion
        const task = await db_1.default.task.findUnique({
            where: { id: comment.taskId },
            include: { project: true },
        });
        if (task) {
            await activity_service_1.ActivityService.log({
                workspaceId: task.project.workspaceId,
                taskId: comment.taskId,
                userId,
                action: 'comment_deleted',
                details: { commentId: comment.id, content: comment.content.substring(0, 200) },
            });
        }
        // Delete comment
        await db_1.default.comment.delete({
            where: { id: commentId },
        });
    }
    /**
     * Get comments by user
     *
     * Returns all comments authored by specified user.
     *
     * @param userId - User ID
     * @param page - Pagination page
     * @param limit - Items per page
     * @returns Paginated list of comments
     */
    static async getUserComments(userId, page = 1, limit = 50) {
        // Verify user exists
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Get comments
        const comments = await db_1.default.comment.findMany({
            where: { userId },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
        const total = await db_1.default.comment.count({ where: { userId } });
        const enrichedComments = comments.map((comment) => ({
            ...comment,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        }));
        return {
            data: enrichedComments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get comment count for task
     *
     * Useful for displaying comment badge on task.
     *
     * @param taskId - Task ID
     * @returns Number of comments on task
     */
    static async getCommentCount(taskId) {
        return db_1.default.comment.count({
            where: { taskId },
        });
    }
    /**
     * Get recent comments across workspace
     *
     * Returns latest comments for activity feed.
     * Only returns comments from tasks user has access to.
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID (for permission check)
     * @param limit - Maximum comments to return
     * @returns List of recent comments with context
     */
    static async getRecentComments(workspaceId, _userId, limit = 20) {
        // Get all projects in workspace
        const projects = await db_1.default.project.findMany({
            where: { workspaceId },
            select: { id: true, name: true },
        });
        const projectIds = projects.map((p) => p.id);
        // Get recent comments from those projects
        const comments = await db_1.default.comment.findMany({
            where: {
                task: {
                    projectId: { in: projectIds },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                task: {
                    select: { id: true, title: true, projectId: true },
                },
                user: true,
            },
        });
        // Enrich with project names
        return comments.map((comment) => {
            const project = projects.find((p) => p.id === comment.task.projectId);
            return {
                ...comment,
                taskTitle: comment.task.title,
                projectName: project?.name || 'Unknown Project',
                user: {
                    id: comment.user.id,
                    email: comment.user.email,
                    name: comment.user.name,
                    avatarUrl: comment.user.avatarUrl,
                    createdAt: comment.user.createdAt,
                    updatedAt: comment.user.updatedAt,
                },
            };
        });
    }
    /**
     * Check if user can edit comment
     *
     * @param commentId - Comment ID
     * @param userId - User ID
     * @returns true if user is comment author
     */
    static async canEditComment(commentId, userId) {
        const comment = await db_1.default.comment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            return false;
        }
        return comment.userId === userId;
    }
}
exports.CommentService = CommentService;
