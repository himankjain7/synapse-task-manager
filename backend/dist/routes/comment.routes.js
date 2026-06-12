"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_1 = require("../controllers/comment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
/**
 * Comment Routes
 *
 * All endpoints require authentication (requireAuth middleware).
 * All operations require task/workspace membership.
 *
 * Endpoints:
 * - POST /tasks/:taskId/comments - Create comment
 * - GET /tasks/:taskId/comments - List comments on task
 * - GET /tasks/:taskId/comments/:id - Get single comment
 * - PATCH /tasks/:taskId/comments/:id - Update comment (author only)
 * - DELETE /tasks/:taskId/comments/:id - Delete comment (author only)
 * - GET /tasks/:taskId/comments/count - Get comment count
 * - GET /comments/my - Get user's comments
 * - GET /workspaces/:workspaceId/activity - Activity feed
 */
const router = (0, express_1.Router)({ mergeParams: true });
/**
 * Apply authentication middleware to all routes
 */
router.use(auth_middleware_1.requireAuth);
/**
 * POST /tasks/:taskId/comments
 * Create a new comment on a task
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 * 2. validateBody
 * 3. validateRequired - content required
 * 4. sanitizeFields - Remove dangerous HTML
 *
 * Request body:
 * {
 *   content: string (1-5000 chars)
 * }
 *
 * Response: 201 Created
 * Comment object with author information
 */
router.post('/', (0, validation_middleware_1.validateUUID)('taskId'), validation_middleware_1.validateBody, (0, validation_middleware_1.validateRequired)(['content']), (0, validation_middleware_1.sanitizeFields)(['content']), comment_controller_1.CommentController.createComment);
/**
 * GET /tasks/:taskId/comments
 * List comments on a task
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 * 2. validatePagination
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of comments in chronological order
 */
router.get('/', (0, validation_middleware_1.validateUUID)('taskId'), validation_middleware_1.validatePagination, comment_controller_1.CommentController.listComments);
/**
 * GET /tasks/:taskId/comments/:id
 * Get single comment details
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 * 2. validateUUID('id')
 *
 * Response: 200 OK
 * Comment object with author details
 */
router.get('/:id', (0, validation_middleware_1.validateUUID)('taskId'), (0, validation_middleware_1.validateUUID)('id'), comment_controller_1.CommentController.getComment);
/**
 * PATCH /tasks/:taskId/comments/:id
 * Update a comment
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. validateRequired - content required
 * 5. sanitizeFields
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
 */
router.patch('/:id', (0, validation_middleware_1.validateUUID)('taskId'), (0, validation_middleware_1.validateUUID)('id'), validation_middleware_1.validateBody, (0, validation_middleware_1.validateRequired)(['content']), (0, validation_middleware_1.sanitizeFields)(['content']), comment_controller_1.CommentController.updateComment);
/**
 * DELETE /tasks/:taskId/comments/:id
 * Delete a comment
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 * 2. validateUUID('id')
 *
 * Only the comment author can delete.
 *
 * Response: 204 No Content
 */
router.delete('/:id', (0, validation_middleware_1.validateUUID)('taskId'), (0, validation_middleware_1.validateUUID)('id'), comment_controller_1.CommentController.deleteComment);
/**
 * GET /tasks/:taskId/comments/count
 * Get comment count for a task
 *
 * Middleware chain:
 * 1. validateUUID('taskId')
 *
 * Useful for UI badges showing number of comments.
 *
 * Response: 200 OK
 * {
 *   count: number
 * }
 */
router.get('/count', (0, validation_middleware_1.validateUUID)('taskId'), comment_controller_1.CommentController.getCommentCount);
/**
 * GET /comments/my
 * Get all comments by current user
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of user's comments
 */
router.get('/my', validation_middleware_1.validatePagination, comment_controller_1.CommentController.getUserComments);
/**
 * GET /workspaces/:workspaceId/activity
 * Get activity feed for workspace
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 *
 * Query params:
 * - limit: number (default 20, max 50)
 *
 * Returns recent comments with task and project context.
 *
 * Response: 200 OK
 * List of recent comments
 */
router.get('/activity', (0, validation_middleware_1.validateUUID)('workspaceId'), comment_controller_1.CommentController.getActivityFeed);
exports.default = router;
