import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateUUID,
  validatePagination,
  validateBody,
  validateRequired,
  sanitizeFields,
} from '../middleware/validation.middleware';

/**
 * Project Routes
 *
 * All endpoints require authentication (requireAuth middleware).
 * All operations require workspace membership.
 *
 * Endpoints:
 * - POST /workspaces/:workspaceId/projects - Create project
 * - GET /workspaces/:workspaceId/projects - List projects
 * - GET /workspaces/:workspaceId/projects/:id - Get project details
 * - PATCH /workspaces/:workspaceId/projects/:id - Update project
 * - POST /workspaces/:workspaceId/projects/:id/archive - Archive project
 * - POST /workspaces/:workspaceId/projects/:id/unarchive - Unarchive project
 * - DELETE /workspaces/:workspaceId/projects/:id - Delete project
 * - GET /workspaces/:workspaceId/projects/:id/stats - Get project statistics
 */
const router = Router({ mergeParams: true });

/**
 * Apply authentication middleware to all routes
 */
router.use(requireAuth);

/**
 * POST /workspaces/:workspaceId/projects
 * Create a new project
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateBody
 * 3. validateRequired - name required
 * 4. sanitizeFields
 *
 * Request body:
 * {
 *   name: string (1-100 chars),
 *   description?: string (max 500),
 *   color?: string (hex color)
 * }
 *
 * Response: 201 Created
 * Project object with owner
 */
router.post(
  '/',
  validateUUID('workspaceId'),
  validateBody,
  validateRequired(['name']),
  sanitizeFields(['name', 'description']),
  ProjectController.createProject
);

/**
 * GET /workspaces/:workspaceId/projects
 * List projects in workspace
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validatePagination
 *
 * Query params:
 * - status?: 'active' | 'archived' | 'on_hold' (filter)
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of projects
 */
router.get(
  '/',
  validateUUID('workspaceId'),
  validatePagination,
  ProjectController.listProjects
);

/**
 * GET /workspaces/:workspaceId/projects/:id
 * Get project details
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 *
 * Response: 200 OK
 * Project object with owner
 */
router.get(
  '/:id',
  validateUUID('workspaceId'),
  validateUUID('id'),
  ProjectController.getProject
);

/**
 * PATCH /workspaces/:workspaceId/projects/:id
 * Update project details
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 * 3. validateBody
 * 4. sanitizeFields
 *
 * Only owner or workspace admin can update.
 *
 * Request body:
 * {
 *   name?: string,
 *   description?: string,
 *   color?: string
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id',
  validateUUID('workspaceId'),
  validateUUID('id'),
  validateBody,
  sanitizeFields(['name', 'description']),
  ProjectController.updateProject
);

/**
 * POST /workspaces/:workspaceId/projects/:id/archive
 * Archive a project
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 *
 * Sets project status to ARCHIVED.
 * Archived projects don't appear in default listings.
 *
 * Response: 200 OK
 * Updated project object
 */
router.post(
  '/:id/archive',
  validateUUID('workspaceId'),
  validateUUID('id'),
  ProjectController.archiveProject
);

/**
 * POST /workspaces/:workspaceId/projects/:id/unarchive
 * Unarchive a project
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 *
 * Sets project status back to ACTIVE.
 *
 * Response: 200 OK
 * Updated project object
 */
router.post(
  '/:id/unarchive',
  validateUUID('workspaceId'),
  validateUUID('id'),
  ProjectController.unarchiveProject
);

/**
 * DELETE /workspaces/:workspaceId/projects/:id
 * Delete project
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 *
 * Only owner or admin can delete.
 * Cascades to all tasks and comments.
 *
 * Response: 204 No Content
 */
router.delete(
  '/:id',
  validateUUID('workspaceId'),
  validateUUID('id'),
  ProjectController.deleteProject
);

/**
 * GET /workspaces/:workspaceId/projects/:id/stats
 * Get project statistics
 *
 * Middleware chain:
 * 1. validateUUID('workspaceId')
 * 2. validateUUID('id')
 *
 * Response: 200 OK
 * {
 *   totalTasks: number,
 *   completedTasks: number,
 *   todoTasks: number,
 *   inProgressTasks: number,
 *   completionPercentage: number (0-100)
 * }
 */
router.get(
  '/:id/stats',
  validateUUID('workspaceId'),
  validateUUID('id'),
  ProjectController.getProjectStats
);

export default router;

