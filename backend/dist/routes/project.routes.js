"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
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
const router = (0, express_1.Router)({ mergeParams: true });
/**
 * Apply authentication middleware to all routes
 */
router.use(auth_middleware_1.requireAuth);
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
router.post('/', validation_middleware_1.validateBody, (0, validation_middleware_1.validateRequired)(['name']), (0, validation_middleware_1.sanitizeFields)(['name', 'description']), project_controller_1.ProjectController.createProject);
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
router.get('/', validation_middleware_1.validatePagination, project_controller_1.ProjectController.listProjects);
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
router.get('/:id', (0, validation_middleware_1.validateUUID)('id'), project_controller_1.ProjectController.getProject);
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
router.patch('/:id', (0, validation_middleware_1.validateUUID)('id'), validation_middleware_1.validateBody, (0, validation_middleware_1.sanitizeFields)(['name', 'description']), project_controller_1.ProjectController.updateProject);
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
router.post('/:id/archive', (0, validation_middleware_1.validateUUID)('id'), project_controller_1.ProjectController.archiveProject);
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
router.post('/:id/unarchive', (0, validation_middleware_1.validateUUID)('id'), project_controller_1.ProjectController.unarchiveProject);
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
router.delete('/:id', (0, validation_middleware_1.validateUUID)('id'), project_controller_1.ProjectController.deleteProject);
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
router.get('/:id/stats', (0, validation_middleware_1.validateUUID)('id'), project_controller_1.ProjectController.getProjectStats);
exports.default = router;
