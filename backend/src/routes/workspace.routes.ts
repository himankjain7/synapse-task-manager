import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateUUID,
  validatePagination,
  validateBody,
  validateRequired,
  sanitizeFields,
} from '../middleware/validation.middleware';

/**
 * Workspace Routes
 *
 * All endpoints require authentication (requireAuth middleware).
 *
 * Endpoints:
 * - POST /workspaces - Create workspace
 * - GET /workspaces - List user's workspaces
 * - GET /workspaces/:id - Get workspace details
 * - PATCH /workspaces/:id - Update workspace
 * - DELETE /workspaces/:id - Delete workspace
 * - POST /workspaces/:id/members - Add member
 * - GET /workspaces/:id/members - List members
 * - PATCH /workspaces/:id/members/:memberId - Update member role
 * - DELETE /workspaces/:id/members/:memberId - Remove member
 * - POST /workspaces/:id/leave - Leave workspace
 */
const router = Router();

/**
 * Apply authentication middleware to all routes
 */
router.use(requireAuth);

/**
 * POST /workspaces
 * Create a new workspace
 *
 * Middleware chain:
 * 1. validateBody - Ensure body exists
 * 2. validateRequired - name is required
 * 3. sanitizeFields - Clean inputs
 *
 * Request body:
 * {
 *   name: string (1-100 chars),
 *   description?: string (max 500),
 *   logo?: string (hex color)
 * }
 *
 * Response: 201 Created
 * Authenticated user becomes OWNER
 */
router.post(
  '/',
  validateBody,
  validateRequired(['name']),
  sanitizeFields(['name', 'description']),
  WorkspaceController.createWorkspace
);

/**
 * GET /workspaces
 * List user's workspaces
 *
 * Middleware chain:
 * 1. validatePagination - Validate page/limit params
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 *
 * Response: 200 OK
 * Paginated list of workspaces
 */
router.get('/', validatePagination, WorkspaceController.listWorkspaces);

/**
 * GET /workspaces/:id
 * Get workspace details
 *
 * Middleware chain:
 * 1. validateUUID('id') - Validate workspace ID format
 *
 * Response: 200 OK
 * Workspace object with owner
 *
 * Errors:
 * - 400: Invalid UUID format
 * - 403: Not a member
 * - 404: Not found
 */
router.get('/:id', validateUUID('id'), WorkspaceController.getWorkspace);

/**
 * PATCH /workspaces/:id
 * Update workspace details
 *
 * Middleware chain:
 * 1. validateUUID('id')
 * 2. validateBody
 * 3. sanitizeFields
 *
 * Only OWNER or ADMIN can update.
 *
 * Request body:
 * {
 *   name?: string,
 *   description?: string,
 *   logo?: string
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id',
  validateUUID('id'),
  validateBody,
  sanitizeFields(['name', 'description']),
  WorkspaceController.updateWorkspace
);

/**
 * DELETE /workspaces/:id
 * Delete workspace
 *
 * Middleware chain:
 * 1. validateUUID('id')
 *
 * Only OWNER can delete.
 * Cascades to projects, tasks, comments.
 *
 * Response: 204 No Content
 */
router.delete('/:id', validateUUID('id'), WorkspaceController.deleteWorkspace);

/**
 * POST /workspaces/:id/members
 * Add member to workspace
 *
 * Middleware chain:
 * 1. validateUUID('id')
 * 2. validateBody
 * 3. validateRequired - email and role required
 * 4. validateEmailField
 *
 * Only OWNER or ADMIN can add members.
 *
 * Request body:
 * {
 *   email: string (email of user to invite),
 *   role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'
 * }
 *
 * Response: 201 Created
 */
router.post(
  '/:id/members',
  validateUUID('id'),
  validateBody,
  validateRequired(['email', 'role']),
  WorkspaceController.addMember
);

/**
 * GET /workspaces/:id/members
 * List workspace members
 *
 * Middleware chain:
 * 1. validateUUID('id')
 * 2. validatePagination
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 *
 * Response: 200 OK
 * Paginated list of members with user info
 */
router.get('/:id/members', validateUUID('id'), validatePagination, WorkspaceController.getMembers);

/**
 * PATCH /workspaces/:id/members/:memberId
 * Update member role
 *
 * Middleware chain:
 * 1. validateUUID('id')
 * 2. validateUUID('memberId')
 * 3. validateBody
 * 4. validateRequired - role required
 *
 * Only OWNER can change roles.
 *
 * Request body:
 * {
 *   role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'
 * }
 *
 * Response: 200 OK
 */
router.patch(
  '/:id/members/:memberId',
  validateUUID('id'),
  validateUUID('memberId'),
  validateBody,
  validateRequired(['role']),
  WorkspaceController.updateMemberRole
);

/**
 * DELETE /workspaces/:id/members/:memberId
 * Remove member from workspace
 *
 * Middleware chain:
 * 1. validateUUID('id')
 * 2. validateUUID('memberId')
 *
 * Only OWNER can remove members.
 *
 * Response: 204 No Content
 */
router.delete(
  '/:id/members/:memberId',
  validateUUID('id'),
  validateUUID('memberId'),
  WorkspaceController.removeMember
);

/**
 * POST /workspaces/:id/leave
 * Leave workspace
 *
 * Middleware chain:
 * 1. validateUUID('id')
 *
 * Member leaves workspace.
 * Owner cannot leave (must delete workspace instead).
 *
 * Response: 204 No Content
 */
router.post('/:id/leave', validateUUID('id'), WorkspaceController.leaveWorkspace);

export default router;
