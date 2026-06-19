import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateUUID,
  validatePagination,
  validateBody,
  validateRequired,
  sanitizeFields,
} from '../middleware/validation.middleware';

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
const router = Router({ mergeParams: true });

/**
 * Apply authentication middleware to all routes
 */
router.use(requireAuth);

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
router.post(
  '/',
  validateUUID('taskId'),
  validateBody,
  validateRequired(['content']),
  sanitizeFields(['content']),
  CommentController.createComment
);

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
router.get(
  '/',
  validatePagination,
  CommentController.listComments
);

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
router.get(
  '/:id',
  validateUUID('id'),
  CommentController.getComment
);

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
router.patch(
  '/:id',
  validateUUID('id'),
  validateBody,
  validateRequired(['content']),
  sanitizeFields(['content']),
  CommentController.updateComment
);

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
router.delete(
  '/:id',
  validateUUID('id'),
  CommentController.deleteComment
);

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
router.get(
  '/count',
  CommentController.getCommentCount
);

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
router.get('/my', validatePagination, CommentController.getUserComments);

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
router.get(
  '/activity',
  CommentController.getActivityFeed
);

export default router;
