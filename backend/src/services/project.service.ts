import prisma from '../config/db';
import { WorkspaceService } from './workspace.service';
import {
  Project,
  ProjectWithOwner,
  ProjectStatus,
  CreateProjectRequest,
  UpdateProjectRequest,
  PaginatedResponse,
} from '../models';

/**
 * Project Business Logic Service
 *
 * Handles all project operations:
 * - CRUD operations for projects within workspaces
 * - Project state management (active, archived, on-hold)
 * - Task counting and statistics
 * - Permission validation
 *
 * Security:
 * - Verifies user is workspace member before operations
 * - Enforces workspace-level access control
 */
export class ProjectService {
  /**
   * Create a new project in workspace
   *
   * Only workspace members can create projects.
   * Creator becomes the project owner.
   *
   * @param workspaceId - Workspace ID
   * @param userId - User creating project (must be workspace member)
   * @param data - Project creation data
   * @returns Created project with owner info
   * @throws Error if user not workspace member or workspace doesn't exist
   */
  static async createProject(
    workspaceId: string,
    userId: string,
    data: CreateProjectRequest
  ): Promise<ProjectWithOwner> {
    // Verify user is workspace member
    const hasAccess = await WorkspaceService.hasWorkspacePermission(
      workspaceId,
      userId
    );

    if (!hasAccess) {
      throw new Error('Permission denied: not a member of this workspace');
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get user for owner info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color || '#3B82F6', // Default blue
        ownerId: userId,
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
      },
    });

    return {
      ...project,
      status: project.status as ProjectStatus,
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
   * Get project by ID
   *
   * @param projectId - Project ID
   * @returns Project with owner info, or null if not found
   */
  static async getProjectById(projectId: string): Promise<ProjectWithOwner | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    const owner = project.ownerId
      ? await prisma.user.findUnique({
          where: { id: project.ownerId },
        })
      : null;

    return {
      ...project,
      status: project.status as ProjectStatus,
      owner: owner
        ? {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            avatarUrl: owner.avatarUrl,
            createdAt: owner.createdAt,
            updatedAt: owner.updatedAt,
          }
        : null,
    };
  }

  /**
   * Get all projects in workspace
   *
   * User must be workspace member to view projects.
   * Can filter by status (active, archived, on-hold).
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID (for permission check)
   * @param status - Filter by status (optional)
   * @param page - Pagination page (default: 1)
   * @param limit - Items per page (default: 50)
   * @returns Paginated list of projects
   * @throws Error if user not workspace member
   */
  static async getWorkspaceProjects(
    workspaceId: string,
    userId: string,
    status?: ProjectStatus,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ProjectWithOwner>> {
    // Verify user is workspace member
    const hasAccess = await WorkspaceService.hasWorkspacePermission(
      workspaceId,
      userId
    );

    if (!hasAccess) {
      throw new Error('Permission denied: not a member of this workspace');
    }

    // Build query
    const where = { workspaceId, ...(status && { status }) };

    // Get projects
    const projects = await prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.project.count({ where });

    // Enrich with owner info
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const owner = project.ownerId
          ? await prisma.user.findUnique({
              where: { id: project.ownerId },
            })
          : null;

        return {
          ...project,
          status: project.status as ProjectStatus,
          owner: owner
            ? {
                id: owner.id,
                email: owner.email,
                name: owner.name,
                avatarUrl: owner.avatarUrl,
                createdAt: owner.createdAt,
                updatedAt: owner.updatedAt,
              }
            : null,
        };
      })
    );

    return {
      data: enrichedProjects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update project details
   *
   * Only project owner or workspace admin/owner can update.
   *
   * @param projectId - Project ID
   * @param userId - User ID (must be owner or admin)
   * @param data - Update data
   * @returns Updated project
   * @throws Error if permission denied or project not found
   */
  static async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectRequest
  ): Promise<Project> {
    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permission
    const isOwner = project.ownerId === userId;
    if (!isOwner) {
      // Check if user is workspace admin/owner
      const isAdmin = await WorkspaceService.hasWorkspacePermission(
        project.workspaceId,
        userId,
        'admin'
      );

      if (!isAdmin) {
        throw new Error('Permission denied: only owner or admin can update project');
      }
    }

    // Update project
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.color && { color: data.color }),
        ...(data.status && { status: data.status }),
      },
    });

    return {
      ...updated,
      status: updated.status as ProjectStatus,
    };
  }

  /**
   * Archive project
   *
   * Archived projects are hidden from main view but not deleted.
   * Users can still view archived projects and their tasks.
   *
   * @param projectId - Project ID
   * @param userId - User ID (must be owner or admin)
   * @throws Error if permission denied or project not found
   */
  static async archiveProject(projectId: string, userId: string): Promise<void> {
    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permission
    const isOwner = project.ownerId === userId;
    if (!isOwner) {
      const isAdmin = await WorkspaceService.hasWorkspacePermission(
        project.workspaceId,
        userId,
        'admin'
      );

      if (!isAdmin) {
        throw new Error('Permission denied: only owner or admin can archive project');
      }
    }

    // Archive project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.ARCHIVED,
      },
    });
  }

  /**
   * Unarchive project
   *
   * Restores archived project to active status.
   *
   * @param projectId - Project ID
   * @param userId - User ID (must be owner or admin)
   * @throws Error if permission denied or project not found
   */
  static async unarchiveProject(projectId: string, userId: string): Promise<void> {
    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permission
    const isOwner = project.ownerId === userId;
    if (!isOwner) {
      const isAdmin = await WorkspaceService.hasWorkspacePermission(
        project.workspaceId,
        userId,
        'admin'
      );

      if (!isAdmin) {
        throw new Error('Permission denied: only owner or admin can unarchive project');
      }
    }

    // Unarchive project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.ACTIVE,
      },
    });
  }

  /**
   * Delete project
   *
   * Deletes project and all associated tasks/comments.
   * Only owner or workspace admin can delete.
   *
   * @param projectId - Project ID
   * @param userId - User ID (must be owner or admin)
   * @throws Error if permission denied or project not found
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permission
    const isOwner = project.ownerId === userId;
    if (!isOwner) {
      const isAdmin = await WorkspaceService.hasWorkspacePermission(
        project.workspaceId,
        userId,
        'admin'
      );

      if (!isAdmin) {
        throw new Error('Permission denied: only owner or admin can delete project');
      }
    }

    // Delete project (cascades to tasks and comments)
    await prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Get project statistics
   *
   * Returns task counts by status and completion percentage.
   *
   * @param projectId - Project ID
   * @returns Project statistics (task counts, completion %)
   */
  static async getProjectStats(
    projectId: string
  ): Promise<{
    totalTasks: number;
    completedTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    completionPercentage: number;
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const [total, completed, todo, inProgress] = await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.task.count({
        where: { projectId, status: 'done' },
      }),
      prisma.task.count({
        where: { projectId, status: 'todo' },
      }),
      prisma.task.count({
        where: { projectId, status: 'in_progress' },
      }),
    ]);

    return {
      totalTasks: total,
      completedTasks: completed,
      todoTasks: todo,
      inProgressTasks: inProgress,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Check if user has access to project
   *
   * User has access if they're a member of the workspace.
   *
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns true if user can access project
   */
  static async canAccessProject(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return false;
    }

    return WorkspaceService.hasWorkspacePermission(
      project.workspaceId,
      userId
    );
  }
}

