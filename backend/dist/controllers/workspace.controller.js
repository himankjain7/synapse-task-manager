"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceController = void 0;
const workspace_service_1 = require("../services/workspace.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
const models_1 = require("../models");
/**
 * Workspace Controller
 *
 * Handles HTTP requests for workspace operations:
 * - Create/read/update/delete workspaces
 * - Manage workspace members
 * - Handle role-based access control
 *
 * All endpoints require authentication (checked by middleware).
 * Authorization is checked per endpoint based on user role.
 */
class WorkspaceController {
    /**
     * POST /workspaces
     * Create a new workspace
     *
     * Request body:
     * {
     *   name: string (required, 1-100 chars),
     *   description?: string (max 500 chars),
     *   logo?: string (hex color)
     * }
     *
     * Response: 201 Created
     * Workspace object with authenticated user as OWNER member
     *
     * Errors:
     * - 400: Invalid input
     * - 401: Not authenticated
     */
    static createWorkspace = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const data = req.body;
        const workspace = await workspace_service_1.WorkspaceService.createWorkspace(userId, data);
        res.status(201).json({
            success: true,
            data: workspace,
            message: 'Workspace created',
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces/:id
     * Get workspace details
     *
     * Response: 200 OK
     * Workspace object with owner information
     *
     * Errors:
     * - 404: Workspace not found
     * - 401: Not a member
     */
    static getWorkspace = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify user is member of workspace
        const hasAccess = await workspace_service_1.WorkspaceService.canAccessWorkspace(id, userId);
        if (!hasAccess) {
            throw new error_middleware_2.ForbiddenError('You do not have access to this workspace');
        }
        const workspace = await workspace_service_1.WorkspaceService.getWorkspaceById(id);
        if (!workspace) {
            throw new error_middleware_2.NotFoundError('Workspace', id);
        }
        res.status(200).json({
            success: true,
            data: workspace,
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces
     * List user's workspaces with pagination
     *
     * Query params:
     * - page: number (default 1)
     * - limit: number (default 20, max 100)
     *
     * Response: 200 OK
     * Paginated list of workspaces
     */
    static listWorkspaces = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await workspace_service_1.WorkspaceService.getUserWorkspaces(userId, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /workspaces/:id
     * Update workspace details
     *
     * Only workspace OWNER or ADMIN can update.
     *
     * Request body:
     * {
     *   name?: string,
     *   description?: string,
     *   logo?: string
     * }
     *
     * Response: 200 OK
     * Updated workspace object
     *
     * Errors:
     * - 403: Not authorized
     * - 404: Workspace not found
     */
    static updateWorkspace = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check permissions
        const role = await workspace_service_1.WorkspaceService.getUserRoleInWorkspace(id, userId);
        if (role !== models_1.WorkspaceMemberRole.OWNER && role !== models_1.WorkspaceMemberRole.ADMIN) {
            throw new error_middleware_2.ForbiddenError('Only owner or admin can update workspace');
        }
        const data = req.body;
        const workspace = await workspace_service_1.WorkspaceService.updateWorkspace(id, userId, data);
        res.status(200).json({
            success: true,
            data: workspace,
            message: 'Workspace updated',
            timestamp: new Date(),
        });
    });
    /**
     * DELETE /workspaces/:id
     * Delete workspace (cascades to projects, tasks, comments)
     *
     * Only workspace OWNER can delete.
     *
     * Response: 204 No Content
     *
     * Errors:
     * - 403: Not owner
     * - 404: Workspace not found
     */
    static deleteWorkspace = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check permissions - owner only
        const role = await workspace_service_1.WorkspaceService.getUserRoleInWorkspace(id, userId);
        if (role !== models_1.WorkspaceMemberRole.OWNER) {
            throw new error_middleware_2.ForbiddenError('Only owner can delete workspace');
        }
        await workspace_service_1.WorkspaceService.deleteWorkspace(id, userId);
        res.status(204).send();
    });
    /**
     * POST /workspaces/:id/members
     * Add member to workspace
     *
     * Only OWNER or ADMIN can invite members.
     *
     * Request body:
     * {
     *   email: string (email of user to invite),
     *   role: WorkspaceMemberRole (OWNER/ADMIN/MEMBER/GUEST)
     * }
     *
     * Response: 201 Created
     * WorkspaceMember object with user details
     *
     * Errors:
     * - 400: User not found
     * - 403: Not authorized to invite
     * - 409: User already member
     */
    static addMember = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check permissions
        const role = await workspace_service_1.WorkspaceService.getUserRoleInWorkspace(id, userId);
        if (role !== models_1.WorkspaceMemberRole.OWNER && role !== models_1.WorkspaceMemberRole.ADMIN) {
            throw new error_middleware_2.ForbiddenError('Only owner or admin can add members');
        }
        const member = await workspace_service_1.WorkspaceService.addWorkspaceMember(id, userId, req.body);
        res.status(201).json({
            success: true,
            data: member,
            message: 'Member added',
            timestamp: new Date(),
        });
    });
    /**
     * GET /workspaces/:id/members
     * List workspace members with pagination
     *
     * Query params:
     * - page: number (default 1)
     * - limit: number (default 20)
     *
     * Response: 200 OK
     * Paginated list of members with user info
     */
    static getMembers = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify user is member
        const hasAccess = await workspace_service_1.WorkspaceService.canAccessWorkspace(id, userId);
        if (!hasAccess) {
            throw new error_middleware_2.ForbiddenError('You do not have access to this workspace');
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await workspace_service_1.WorkspaceService.getWorkspaceMembers(id, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /workspaces/:id/members/:memberId
     * Update member role
     *
     * Only OWNER can change roles.
     *
     * Request body:
     * {
     *   role: WorkspaceMemberRole (OWNER/ADMIN/MEMBER/GUEST)
     * }
     *
     * Response: 200 OK
     * Updated member object
     *
     * Errors:
     * - 403: Not owner
     * - 404: Member not found
     */
    static updateMemberRole = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id, memberId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check permissions - owner only
        const role = await workspace_service_1.WorkspaceService.getUserRoleInWorkspace(id, userId);
        if (role !== models_1.WorkspaceMemberRole.OWNER) {
            throw new error_middleware_2.ForbiddenError('Only owner can change member roles');
        }
        const member = await workspace_service_1.WorkspaceService.updateWorkspaceMemberRole(id, userId, memberId, req.body);
        res.status(200).json({
            success: true,
            data: member,
            message: 'Member role updated',
            timestamp: new Date(),
        });
    });
    /**
     * DELETE /workspaces/:id/members/:memberId
     * Remove member from workspace
     *
     * Only OWNER can remove members. Cannot remove owner.
     *
     * Response: 204 No Content
     *
     * Errors:
     * - 403: Not owner or cannot remove owner
     * - 404: Member not found
     */
    static removeMember = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id, memberId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Check permissions - owner only
        const role = await workspace_service_1.WorkspaceService.getUserRoleInWorkspace(id, userId);
        if (role !== models_1.WorkspaceMemberRole.OWNER) {
            throw new error_middleware_2.ForbiddenError('Only owner can remove members');
        }
        await workspace_service_1.WorkspaceService.removeWorkspaceMember(id, userId, memberId);
        res.status(204).send();
    });
    /**
     * POST /workspaces/:id/leave
     * Leave workspace
     *
     * Member leaves workspace. Owner cannot leave.
     *
     * Response: 204 No Content
     *
     * Errors:
     * - 403: Cannot remove owner
     * - 404: Workspace not found
     */
    static leaveWorkspace = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        await workspace_service_1.WorkspaceService.leaveWorkspace(id, userId);
        res.status(204).send();
    });
}
exports.WorkspaceController = WorkspaceController;
