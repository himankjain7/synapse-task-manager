import prisma from '../config/db';
import { ActivityService } from './activity.service';
import {
  Workspace,
  WorkspaceWithOwner,
  WorkspaceMember,
  WorkspaceMemberWithUser,
  WorkspaceMemberRole,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddWorkspaceMemberRequest,
  UpdateWorkspaceMemberRequest,
  PaginatedResponse,
} from '../models';

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
export class WorkspaceService {
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
  static async createWorkspace(
    userId: string,
    data: CreateWorkspaceRequest
  ): Promise<WorkspaceWithOwner> {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Automatically add creator as OWNER member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: WorkspaceMemberRole.OWNER,
        joinedAt: new Date(),
      },
    });

    await ActivityService.log({
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
        provider: user.provider ?? 'email',
        emailVerified: user.emailVerified ?? false,
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
  static async getWorkspaceById(workspaceId: string): Promise<WorkspaceWithOwner | null> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return null;
    }

    const owner = await prisma.user.findUnique({
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
        provider: owner.provider ?? 'email',
        emailVerified: owner.emailVerified ?? false,
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
  static async getUserWorkspaces(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<WorkspaceWithOwner>> {
    // Find all workspace memberships for user
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    // Get workspace details
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
    });

    // Get total count
    const total = await prisma.workspaceMember.count({
      where: { userId },
    });

    // Enrich with owner info
    const enrichedWorkspaces = await Promise.all(
      workspaces.map(async (ws) => {
        const owner = await prisma.user.findUnique({
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
            provider: owner.provider ?? 'email',
            emailVerified: owner.emailVerified ?? false,
            createdAt: owner.createdAt,
            updatedAt: owner.updatedAt,
          },
        };
      })
    );

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
  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceRequest
  ): Promise<Workspace> {
    // Verify user is owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can update workspace');
    }

    // Update workspace
    const updated = await prisma.workspace.update({
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
  static async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Verify user is owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can delete workspace');
    }

    // Delete workspace (cascades to members, projects, tasks)
    await prisma.workspace.delete({
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
  static async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    data: AddWorkspaceMemberRequest
  ): Promise<WorkspaceMemberWithUser> {
    // Check user has permission
    const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      throw new Error('Permission denied: only owner or admin can add members');
    }

    // Verify target user exists by email
    const targetUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member of this workspace');
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: data.role,
        joinedAt: new Date(),
      },
    });

    await ActivityService.log({
      workspaceId,
      taskId: null,
      userId,
      action: 'member_added',
      details: { targetUserId: targetUser.id },
    });

    return {
      ...member,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        avatarUrl: targetUser.avatarUrl,
        provider: targetUser.provider ?? 'email',
        emailVerified: targetUser.emailVerified ?? false,
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
  static async getWorkspaceMembers(
    workspaceId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<WorkspaceMemberWithUser>> {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get members
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.workspaceMember.count({
      where: { workspaceId },
    });

    // Enrich with user info
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const user = await prisma.user.findUnique({
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
            provider: user.provider ?? 'email',
            emailVerified: user.emailVerified ?? false,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        };
      })
    );

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
  static async updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    memberId: string,
    data: UpdateWorkspaceMemberRequest
  ): Promise<WorkspaceMember> {
    // Check user is owner
    const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
    if (userRole !== WorkspaceMemberRole.OWNER) {
      throw new Error('Permission denied: only owner can change member roles');
    }

    // Don't allow changing owner role
    const member = await prisma.workspaceMember.findUnique({
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

    if (member.role === WorkspaceMemberRole.OWNER && data.role !== WorkspaceMemberRole.OWNER) {
      throw new Error('Cannot remove owner role. Delete workspace instead.');
    }

    // Update role
    const updated = await prisma.workspaceMember.update({
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
  static async removeWorkspaceMember(
    workspaceId: string,
    userId: string,
    memberId: string
  ): Promise<void> {
    // Check user is owner
    const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
    if (userRole !== WorkspaceMemberRole.OWNER) {
      throw new Error('Permission denied: only owner can remove members');
    }

    // Prevent removing owner
    const member = await prisma.workspaceMember.findUnique({
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

    if (member.role === WorkspaceMemberRole.OWNER) {
      throw new Error('Cannot remove workspace owner. Delete workspace instead.');
    }

    await ActivityService.log({
      workspaceId,
      taskId: null,
      userId,
      action: 'member_removed',
      details: { targetUserId: memberId },
    });

    // Remove member
    await prisma.workspaceMember.delete({
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
  static async getUserRoleInWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberRole | null> {
    const member = await prisma.workspaceMember.findUnique({
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
  static async hasWorkspacePermission(
    workspaceId: string,
    userId: string,
    requiredRole: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER
  ): Promise<boolean> {
    const userRole = await this.getUserRoleInWorkspace(workspaceId, userId);
    if (!userRole) {
      return false;
    }

    const roleHierarchy: Record<WorkspaceMemberRole, number> = {
      [WorkspaceMemberRole.GUEST]: 0,
      [WorkspaceMemberRole.MEMBER]: 1,
      [WorkspaceMemberRole.ADMIN]: 2,
      [WorkspaceMemberRole.OWNER]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user can access workspace (alias for hasWorkspacePermission with default role)
   */
  static async canAccessWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    return this.hasWorkspacePermission(workspaceId, userId);
  }

  /**
   * Leave workspace (member removes themselves)
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @throws Error if user is owner or not a member
   */
  static async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    const member = await prisma.workspaceMember.findUnique({
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

    if (member.role === WorkspaceMemberRole.OWNER) {
      throw new Error('Owner cannot leave workspace. Transfer ownership or delete workspace.');
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }
}

