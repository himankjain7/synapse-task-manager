import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateUUID,
  validatePagination,
  validateBody,
  validateRequired,
  sanitizeFields,
} from '../middleware/validation.middleware';

/**
 * Task Routes
 *
 * All endpoints require authentication (requireAuth middleware).
 * All operations require project/workspace membership.
 *
 * Endpoints:
 * - POST /projects/:projectId/tasks - Create task
 * - GET /projects/:projectId/tasks - List tasks
 * - GET /projects/:projectId/tasks/:id - Get task
 * - PATCH /projects/:projectId/tasks/:id - Update task
 * - PATCH /projects/:projectId/tasks/:id/status - Update status
 * - PATCH /projects/:projectId/tasks/:id/assign - Assign task
 * - DELETE /projects/:projectId/tasks/:id - Delete task
 * - PATCH /projects/:projectId/tasks/:id/reorder - Reorder (drag-and-drop)
 * - POST /projects/:projectId/tasks/bulk-update - Bulk update
 * - GET /tasks/assigned - Get user's assigned tasks
 * - GET /tasks/overdue - Get user's overdue tasks
 */
const router = Router({ mergeParams: true });

/**
 * Apply authentication middleware to all routes
 */
router.use(requireAuth);

/**
 * POST /projects/:projectId/tasks
 * Create a new task
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateBody
 * 3. validateRequired - title required
 * 4. sanitizeFields
 *
 * Request body:
 * {
 *   title: string (1-200 chars),
 *   description?: string,
 *   priority?: 'low' | 'medium' | 'high' | 'urgent',
 *   assignedTo?: string (user ID),
 *   dueDate?: Date,
 *   estimatedHours?: number
 * }
 *
 * Response: 201 Created
 * Task object with assignee
 */
router.post(
  '/',
  validateUUID('projectId'),
  validateBody,
  validateRequired(['title']),
  sanitizeFields(['title', 'description']),
  TaskController.createTask
);

/**
 * GET /projects/:projectId/tasks
 * List tasks in project
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validatePagination
 *
 * Query params (filtering):
 * - status?: 'todo' | 'in_progress' | 'done'
 * - priority?: 'low' | 'medium' | 'high' | 'urgent'
 * - assignedTo?: user ID
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of tasks
 */
router.get(
  '/',
  validateUUID('projectId'),
  validatePagination,
  TaskController.listTasks
);

/**
 * GET /projects/:projectId/tasks/:id
 * Get task details
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 *
 * Response: 200 OK
 * Task object with assignee and project info
 */
router.get(
  '/:id',
  validateUUID('projectId'),
  validateUUID('id'),
  TaskController.getTask
);

/**
 * PATCH /projects/:projectId/tasks/:id
 * Update task details
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. sanitizeFields
 *
 * Request body (all optional):
 * {
 *   title?: string,
 *   description?: string,
 *   priority?: string,
 *   dueDate?: Date,
 *   estimatedHours?: number
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id',
  validateUUID('projectId'),
  validateUUID('id'),
  validateBody,
  sanitizeFields(['title', 'description']),
  TaskController.updateTask
);

/**
 * PATCH /projects/:projectId/tasks/:id/status
 * Update task status quickly
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. validateRequired - status required
 *
 * Shortcut for updating just the status field.
 *
 * Request body:
 * {
 *   status: 'todo' | 'in_progress' | 'done'
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id/status',
  validateUUID('projectId'),
  validateUUID('id'),
  validateBody,
  validateRequired(['status']),
  TaskController.updateTaskStatus
);

/**
 * PATCH /projects/:projectId/tasks/:id/assign
 * Assign or unassign task
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. validateRequired - assignedTo required
 *
 * Request body:
 * {
 *   assignedTo: string | null (user ID or null to unassign)
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id/assign',
  validateUUID('projectId'),
  validateUUID('id'),
  validateBody,
  validateRequired(['assignedTo']),
  TaskController.assignTask
);

/**
 * DELETE /projects/:projectId/tasks/:id
 * Delete task
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 *
 * Any workspace member can delete.
 *
 * Response: 204 No Content
 */
router.delete(
  '/:id',
  validateUUID('projectId'),
  validateUUID('id'),
  TaskController.deleteTask
);

/**
 * PATCH /projects/:projectId/tasks/:id/reorder
 * Reorder task (drag-and-drop)
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. validateRequired - newPosition required
 *
 * Request body:
 * {
 *   newPosition: number (0-based index)
 * }
 *
 * Response: 200 OK
 * Updated task object
 */
router.patch(
  '/:id/reorder',
  validateUUID('projectId'),
  validateUUID('id'),
  validateBody,
  validateRequired(['newPosition']),
  TaskController.reorderTask
);

/**
 * POST /projects/:projectId/tasks/bulk-update
 * Update multiple tasks at once
 *
 * Middleware chain:
 * 1. validateUUID('projectId')
 * 2. validateBody
 * 3. validateRequired - updates required
 *
 * Request body:
 * {
 *   updates: Array<{
 *     id: string,
 *     status?: string,
 *     priority?: string,
 *     assignedTo?: string
 *   }>
 * }
 *
 * Response: 200 OK
 * Array of updated tasks
 */
router.post(
  '/bulk-update',
  validateUUID('projectId'),
  validateBody,
  validateRequired(['updates']),
  TaskController.bulkUpdateTasks
);

/**
 * GET /tasks/assigned
 * Get tasks assigned to current user
 *
 * Query params:
 * - status?: task status filter
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of tasks assigned to user
 */
router.get('/assigned', validatePagination, TaskController.getAssignedTasks);

/**
 * GET /tasks/overdue
 * Get user's overdue tasks
 *
 * Query params:
 * - limit: number (default 10, max 50)
 *
 * Returns tasks with dueDate in past and status != 'done'.
 *
 * Response: 200 OK
 * List of overdue tasks
 */
router.get('/overdue', TaskController.getOverdueTasks);

export default router;
