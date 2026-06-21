"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const db_1 = __importDefault(require("../config/db"));
const activity_service_1 = require("./activity.service");
const models_1 = require("../models");
/**
 * Workspace Business Logic Service
 *
 * Handles all workspace operations:
 * - CRUD operations for workspaces
 * - Member management (add, remove, role changes)
 * - Permission checking
 * - Workspace querying and filtering
 *
 * Security considerations:
 * - Verifies user ownership before allowing modifications
 * - Enforces role-based access control
 * - Validates member permissions before operations
 */
class WorkspaceService {
    /**
     * Create a new workspace
     *
     * Only authenticated users can create workspaces.
     * Creator becomes the owner with full permissions.
     *
     * @param userId - ID of user creating the workspace
     * @param data - Workspace creation data
     * @returns Created workspace with owner info
     * @throws Error if user not found or creation fails
     */
    static async createWorkspace(userId, data) {
        // Verify user exists
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Create workspace
        const workspace = await db_1.default.workspace.create({
            data: {
                name: data.name.trim(),
                description: data.description?.trim() || null,
                ownerId: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        // Automatically add creator as OWNER member
        await db_1.default.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                role: models_1.WorkspaceMemberRole.OWNER,
                joinedAt: new Date(),
            },
        });
        await activity_service_1.ActivityService.log({
            workspaceId: workspace.id,
            taskId: null,
            userId,
            action: 'workspace_created',
            details: { name: workspace.name },
        });
        return {
            ...workspace,
            owner: {
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
     * Get workspace by ID
     *
     * @param workspaceId - Workspace ID
     * @returns Workspace with owner info, or null if not found
     */
    static async getWorkspaceById(workspaceId) {
        const workspace = await db_1.default.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            return null;
        }
        const owner = await db_1.default.user.findUnique({
            where: { id: workspace.ownerId },
        });
        if (!owner) {
            throw new Error('Workspace owner not found');
        }
        return {
            ...workspace,
            owner: {
                id: owner.id,
                email: owner.email,
                name: owner.name,
                avatarUrl: owner.avatarUrl,
                createdAt: owner.createdAt,
                updatedAt: owner.updatedAt,
            },
        };
    }
    /**
     * Get all workspaces for a user
     *
     * Returns workspaces the user is a member of (owner or participant).
     *
     * @param userId - User ID
     * @param page - Pagination page (default: 1)
     * @param limit - Items per page (default: 20)
     * @returns Paginated list of workspaces
     */
    static async getUserWorkspaces(userId, page = 1, limit = 20) {
        // Find all workspace memberships for user
        const memberships = await db_1.default.workspaceMember.findMany({
            where: { userId },
            skip: (page - 1) * limit,
            take: limit,
        });
        const workspaceIds = memberships.map((m) => m.workspaceId);
        // Get workspace details
        const workspaces = await db_1.default.workspace.findMany({
            where: { id: { in: workspaceIds } },
        });
        // Get total count
        const total = await db_1.default.workspaceMember.count({
            where: { userId },
        });
        // Enrich with owner info
        const enrichedWorkspaces = await Promise.all(workspaces.map(async (ws) => {
            const owner = await db_1.default.user.findUnique({
                where: { id: ws.ownerId },
            });
            if (!owner) {
                throw new Error(`Owner ${ws.ownerId} not found for workspace ${ws.id}`);
            }
            return {
                ...ws,
                owner: {
                    id: owner.id,
                    email: owner.email,
                    name: owner.name,
                    avatarUrl: owner.avatarUrl,
                    createdAt: owner.createdAt,
                    updatedAt: owner.updatedAt,
                },
            };
        }));
        return {
            data: enrichedWorkspaces,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update workspace details
     *
     * Only the workspace owner can update workspace info.
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID (must be owner)
     * @param data - Update data
     * @returns Updated workspace
     * @throws Error if user not owner or workspace not found
     */
    static async updateWorkspace(workspaceId, userId, data) {
        // Verify user is owner
        const workspace = await db_1.default.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (workspace.ownerId !== userId) {
            throw new Error('Only workspace owner can update workspace');
        }
        // Update workspace
        const updated = await db_1.default.workspace.update({
            where: { id: workspaceId },
            data: {
                ...(data.name && { name: data.name.trim() }),
                ...(data.description !== undefined && { description: data.description?.trim() || null }),
                updatedAt: new Date(),
            },
        });
        return updated;
    }
    /**
     * Delete a workspace
     *
     * Only the owner can delete. Also deletes all projects and tasks.
     * Cascading delete handled by database constraints.
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID (must be owner)
     * @throws Error if user not owner or workspace not found
     */
    static async deleteWorkspace(workspaceId, userId) {
        // Verify user is owner
        const workspace = await db_1.default.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (workspace.ownerId !== userId) {
            throw new Error('Only workspace owner can delete workspace');
        }
        // Delete workspace (cascades to members, projects, tasks)
        await db_1.default.workspace.delete({
            where: { id: workspaceId },
        });
    }
    /**
     * Add member to workspace
     *
     * Owner or admin can add new members.
     * User must exist in system.
     *
     * @param workspaceId - Workspace ID
     * @param userId - User performing action (must be owner/admin)
     * @param data - Member to add with role
     * @returns Created workspace member
     * @throws Error if permission denied or user not found
     */
    static async addWorkspaceMember(workspaceId, userId, data) {
        // Check user has permission
        const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
        if (!userRole || !['owner', 'admin'].includes(userRole)) {
            throw new Error('Permission denied: only owner or admin can add members');
        }
        // Verify target user exists
        const targetUser = await db_1.default.user.findUnique({
            where: { id: data.userId },
        });
        if (!targetUser) {
            throw new Error('User not found');
        }
        // Check if already a member
        const existing = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: data.userId,
                },
            },
        });
        if (existing) {
            throw new Error('User is already a member of this workspace');
        }
        // Add member
        const member = await db_1.default.workspaceMember.create({
            data: {
                workspaceId,
                userId: data.userId,
                role: data.role,
                joinedAt: new Date(),
            },
        });
        await activity_service_1.ActivityService.log({
            workspaceId,
            taskId: null,
            userId,
            action: 'member_added',
            details: { targetUserId: data.userId },
        });
        return {
            ...member,
            user: {
                id: targetUser.id,
                email: targetUser.email,
                name: targetUser.name,
                avatarUrl: targetUser.avatarUrl,
                createdAt: targetUser.createdAt,
                updatedAt: targetUser.updatedAt,
            },
        };
    }
    /**
     * Get workspace members
     *
     * @param workspaceId - Workspace ID
     * @param page - Pagination page (default: 1)
     * @param limit - Items per page (default: 50)
     * @returns Paginated list of members with user info
     */
    static async getWorkspaceMembers(workspaceId, page = 1, limit = 50) {
        // Verify workspace exists
        const workspace = await db_1.default.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        // Get members
        const members = await db_1.default.workspaceMember.findMany({
            where: { workspaceId },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await db_1.default.workspaceMember.count({
            where: { workspaceId },
        });
        // Enrich with user info
        const enrichedMembers = await Promise.all(members.map(async (member) => {
            const user = await db_1.default.user.findUnique({
                where: { id: member.userId },
            });
            if (!user) {
                throw new Error(`User ${member.userId} not found`);
            }
            return {
                ...member,
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
            data: enrichedMembers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update member role
     *
     * Only owner can change member roles.
     * Owner role cannot be transferred to another user (delete workspace instead).
     *
     * @param workspaceId - Workspace ID
     * @param userId - User performing action (must be owner)
     * @param memberId - Member to update
     * @param data - New role
     * @returns Updated member
     * @throws Error if permission denied or invalid operation
     */
    static async updateWorkspaceMemberRole(workspaceId, userId, memberId, data) {
        // Check user is owner
        const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
        if (userRole !== models_1.WorkspaceMemberRole.OWNER) {
            throw new Error('Permission denied: only owner can change member roles');
        }
        // Don't allow changing owner role
        const member = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId,
                },
            },
        });
        if (!member) {
            throw new Error('Member not found');
        }
        if (member.role === models_1.WorkspaceMemberRole.OWNER && data.role !== models_1.WorkspaceMemberRole.OWNER) {
            throw new Error('Cannot remove owner role. Delete workspace instead.');
        }
        // Update role
        const updated = await db_1.default.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId,
                },
            },
            data: {
                role: data.role,
                updatedAt: new Date(),
            },
        });
        return updated;
    }
    /**
     * Remove member from workspace
     *
     * Only owner can remove members. Owner cannot remove themselves.
     *
     * @param workspaceId - Workspace ID
     * @param userId - User performing action (must be owner)
     * @param memberId - Member to remove
     * @throws Error if permission denied or invalid operation
     */
    static async removeWorkspaceMember(workspaceId, userId, memberId) {
        // Check user is owner
        const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
        if (userRole !== models_1.WorkspaceMemberRole.OWNER) {
            throw new Error('Permission denied: only owner can remove members');
        }
        // Prevent removing owner
        const member = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId,
                },
            },
        });
        if (!member) {
            throw new Error('Member not found');
        }
        if (member.role === models_1.WorkspaceMemberRole.OWNER) {
            throw new Error('Cannot remove workspace owner. Delete workspace instead.');
        }
        await activity_service_1.ActivityService.log({
            workspaceId,
            taskId: null,
            userId,
            action: 'member_removed',
            details: { targetUserId: memberId },
        });
        // Remove member
        await db_1.default.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId,
                },
            },
        });
    }
    /**
     * Get user's role in workspace
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID
     * @returns Role or null if not a member
     */
    static async getUserRoleInWorkspace(workspaceId, userId) {
        const member = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        return member?.role || null;
    }
    /**
     * Check if user has permission for workspace
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID
     * @param requiredRole - Minimum required role ('guest', 'member', 'admin', 'owner')
     * @returns true if user has required role
     */
    static async hasWorkspacePermission(workspaceId, userId, requiredRole = models_1.WorkspaceMemberRole.MEMBER) {
        const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
        if (!userRole) {
            return false;
        }
        const roleHierarchy = {
            [models_1.WorkspaceMemberRole.GUEST]: 0,
            [models_1.WorkspaceMemberRole.MEMBER]: 1,
            [models_1.WorkspaceMemberRole.ADMIN]: 2,
            [models_1.WorkspaceMemberRole.OWNER]: 3,
        };
        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }
    /**
     * Check if user can access workspace (alias for hasWorkspacePermission with default role)
     */
    static async canAccessWorkspace(workspaceId, userId) {
        return this.hasWorkspacePermission(workspaceId, userId);
    }
    /**
     * Leave workspace (member removes themselves)
     *
     * @param workspaceId - Workspace ID
     * @param userId - User ID
     * @throws Error if user is owner or not a member
     */
    static async leaveWorkspace(workspaceId, userId) {
        const member = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!member) {
            throw new Error('You are not a member of this workspace');
        }
        if (member.role === models_1.WorkspaceMemberRole.OWNER) {
            throw new Error('Owner cannot leave workspace. Transfer ownership or delete workspace.');
        }
        await db_1.default.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
    }
}
exports.WorkspaceService = WorkspaceService;
