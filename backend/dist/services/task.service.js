"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const db_1 = __importDefault(require("../config/db"));
const project_service_1 = require("./project.service");
const models_1 = require("../models");
/**
 * Task Business Logic Service
 *
 * Handles all task operations:
 * - CRUD operations for tasks within projects
 * - Task status and priority management
 * - Task assignment to users
 * - Task filtering and sorting
 * - Bulk operations on tasks
 *
 * Security:
 * - Verifies user is project workspace member before operations
 * - Enforces project-level access control
 */
class TaskService {
    /**
     * Create a new task in project
     *
     * Only workspace members can create tasks.
     * Task starts in TODO status with NO assignment.
     *
     * @param projectId - Project ID
     * @param userId - User creating task (must be workspace member)
     * @param data - Task creation data
     * @returns Created task
     * @throws Error if user not workspace member or project doesn't exist
     */
    static async createTask(projectId, userId, data) {
        // Verify project exists and user has access
        const project = await db_1.default.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            throw new Error('Project not found');
        }
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Verify assignee exists (if provided)
        if (data.assignedTo) {
            const assignee = await db_1.default.user.findUnique({
                where: { id: data.assignedTo },
            });
            if (!assignee) {
                throw new Error('Assigned user not found');
            }
        }
        // Get next position for ordering
        const lastTask = await db_1.default.task.findFirst({
            where: { projectId },
            orderBy: { position: 'desc' },
        });
        const position = (lastTask?.position || 0) + 1;
        // Create task
        const task = await db_1.default.task.create({
            data: {
                projectId,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                status: models_1.TaskStatus.todo,
                priority: data.priority || models_1.TaskPriority.medium,
                assignedTo: data.assignedTo || null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                position,
                createdAt: new Date(),
            },
        });
        return this.enrichTaskWithAssignee(task);
    }
    /**
     * Get task by ID
     *
     * @param taskId - Task ID
     * @returns Task with assignee info, or null if not found
     */
    static async getTaskById(taskId) {
        const task = await db_1.default.task.findUnique({
            where: { id: taskId },
            include: {
                labels: {
                    include: {
                        label: true,
                    },
                },
            },
        });
        if (!task) {
            return null;
        }
        const taskLabels = task.labels.map((assignment) => assignment.label);
        const [assignee, project] = await Promise.all([
            task.assignedTo
                ? db_1.default.user.findUnique({
                    where: { id: task.assignedTo },
                })
                : Promise.resolve(null),
            db_1.default.project.findUnique({
                where: { id: task.projectId },
            }),
        ]);
        if (!project) {
            throw new Error('Project not found');
        }
        const result = {
            ...task,
            labels: taskLabels,
            assignee: assignee ? {
                id: assignee.id,
                email: assignee.email,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
                createdAt: assignee.createdAt,
                updatedAt: assignee.updatedAt,
            } : null,
            project: {
                ...project,
                status: project.status,
            },
        };
        return result;
    }
    /**
     * Get all tasks in project with filtering and pagination
     *
     * Supports filtering by:
     * - Status (todo, in_progress, done)
     * - Priority (low, medium, high, urgent)
     * - Assigned user
     * - Due date range
     *
     * @param projectId - Project ID
     * @param userId - User ID (for permission check)
     * @param filters - Filter parameters
     * @returns Paginated list of tasks
     * @throws Error if user not workspace member
     */
    static async getProjectTasks(projectId, userId, filters) {
        // Verify user has project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Build filter query
        const where = { projectId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.priority) {
            where.priority = filters.priority;
        }
        if (filters?.assignedTo) {
            where.assignedTo = filters.assignedTo === 'unassigned' ? null : filters.assignedTo;
        }
        if (filters?.dueDate?.from || filters?.dueDate?.to) {
            where.dueDate = {};
            if (filters.dueDate.from) {
                where.dueDate.gte = filters.dueDate.from;
            }
            if (filters.dueDate.to) {
                where.dueDate.lte = filters.dueDate.to;
            }
        }
        // Pagination
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        // Get tasks
        const tasks = await db_1.default.task.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { position: 'asc' },
        });
        const total = await db_1.default.task.count({ where });
        // Enrich with assignee info
        const enrichedTasks = await Promise.all(tasks.map((task) => this.enrichTaskWithAssignee(task)));
        return {
            data: enrichedTasks,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update task details
     *
     * Can update title, description, priority, status, assignee, due date.
     * Any workspace member can update tasks.
     *
     * @param taskId - Task ID
     * @param userId - User ID (for permission check)
     * @param data - Update data
     * @returns Updated task
     * @throws Error if task not found or access denied
     */
    static async updateTask(taskId, userId, data) {
        // Get task
        const task = await db_1.default.task.findUnique({
            where: { id: taskId },
            include: {
                labels: {
                    include: {
                        label: true,
                    },
                },
            },
        });
        if (!task) {
            throw new Error('Task not found');
        }
        // Verify user has project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Verify new assignee exists (if provided)
        const assigneeId = data.assignedTo ?? data.assigneeId;
        if (assigneeId !== undefined && assigneeId) {
            const assignee = await db_1.default.user.findUnique({
                where: { id: assigneeId },
            });
            if (!assignee) {
                throw new Error('Assigned user not found');
            }
        }
        // Build update data
        const updateData = { updatedAt: new Date() };
        if (data.title)
            updateData.title = data.title.trim();
        if (data.description !== undefined)
            updateData.description = data.description?.trim() || null;
        if (data.status)
            updateData.status = data.status;
        if (data.priority)
            updateData.priority = data.priority;
        if (assigneeId !== undefined)
            updateData.assignedTo = assigneeId || null;
        if (data.dueDate !== undefined)
            updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        const updated = await db_1.default.task.update({
            where: { id: taskId },
            data: updateData,
        });
        const enriched = await this.enrichTaskWithAssignee(updated);
        return enriched;
    }
    /**
     * Update task status
     *
     * Shortcut for quick status updates (e.g., marking done).
     *
     * @param taskId - Task ID
     * @param status - New status
     * @returns Updated task
     */
    static async updateTaskStatus(taskId, status) {
        const task = await db_1.default.task.update({
            where: { id: taskId },
            data: { status, updatedAt: new Date() },
        });
        return this.enrichTaskWithAssignee(task);
    }
    /**
     * Assign task to user
     *
     * @param taskId - Task ID
     * @param userId - User ID to assign to (or null to unassign)
     * @returns Updated task
     */
    static async assignTask(taskId, userId) {
        if (userId) {
            // Verify user exists
            const user = await db_1.default.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new Error('User not found');
            }
        }
        const task = await db_1.default.task.update({
            where: { id: taskId },
            data: { assignedTo: userId, updatedAt: new Date() },
        });
        return this.enrichTaskWithAssignee(task);
    }
    /**
     * Delete task
     *
     * Deletes task and all associated comments.
     * Any workspace member can delete tasks.
     *
     * @param taskId - Task ID
     * @param userId - User ID (for permission check)
     * @throws Error if task not found or access denied
     */
    static async deleteTask(taskId, userId) {
        // Get task
        const task = await db_1.default.task.findUnique({
            where: { id: taskId },
            include: {
                labels: true,
            },
        });
        if (!task) {
            throw new Error('Task not found');
        }
        // Verify user has project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(task.projectId, userId);
        if (!canAccess) {
            throw new Error('Permission denied: not a member of this workspace');
        }
        // Delete task (cascades to comments)
        await db_1.default.task.delete({
            where: { id: taskId },
        });
    }
    /**
     * Reorder task (change position)
     *
     * Adjusts position for task ordering in UI.
     * Used for drag-and-drop functionality.
     *
     * @param taskId - Task ID
     * @param newPosition - New position in list
     * @returns Updated task
     */
    static async reorderTask(taskId, newPosition) {
        const task = await db_1.default.task.update({
            where: { id: taskId },
            data: { position: newPosition, updatedAt: new Date() },
        });
        return this.enrichTaskWithAssignee(task);
    }
    /**
     * Bulk update tasks
     *
     * Updates multiple tasks at once (e.g., bulk status change).
     * Useful for batch operations like "complete all tasks in sprint".
     *
     * @param data - Bulk update data with task IDs and fields to update
     * @returns Array of updated tasks
     */
    static async bulkUpdateTasks(data) {
        const updates = await Promise.all(data.taskIds.map((taskId) => db_1.default.task.update({
            where: { id: taskId },
            data: {
                ...(data.status && { status: data.status }),
                ...(data.priority && { priority: data.priority }),
                ...(data.assignedTo !== undefined && {
                    assignedTo: data.assignedTo || null,
                }),
                updatedAt: new Date(),
            },
        })));
        return Promise.all(updates.map((task) => this.enrichTaskWithAssignee(task)));
    }
    /**
     * Get tasks assigned to user
     *
     * Returns all tasks assigned to specified user across all projects/workspaces.
     *
     * @param userId - User ID
     * @param status - Filter by status (optional)
     * @param page - Pagination page
     * @param limit - Items per page
     * @returns Paginated list of tasks
     */
    static async getUserTasks(userId, status, page = 1, limit = 50) {
        // Verify user exists
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        const where = { assignedTo: userId };
        if (status) {
            where.status = status;
        }
        // Get tasks
        const tasks = await db_1.default.task.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { dueDate: 'asc' },
        });
        const total = await db_1.default.task.count({ where });
        // Enrich with details
        const enrichedTasks = await Promise.all(tasks.map(async (task) => {
            const project = await db_1.default.project.findUnique({
                where: { id: task.projectId },
            });
            if (!project) {
                throw new Error('Project not found');
            }
            return {
                ...task,
                status: task.status,
                priority: task.priority,
                assignee: user
                    ? {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    }
                    : null,
                project: {
                    ...project,
                    status: project.status,
                },
            };
        }));
        return {
            data: enrichedTasks,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get overdue tasks
     *
     * Returns tasks past due date that are not completed.
     *
     * @param limit - Maximum tasks to return
     * @returns List of overdue tasks
     */
    static async getOverdueTasks(limit = 50) {
        const now = new Date();
        const tasks = await db_1.default.task.findMany({
            where: {
                dueDate: { lt: now },
                status: { not: models_1.TaskStatus.done },
            },
            orderBy: { dueDate: 'asc' },
            take: limit,
        });
        return Promise.all(tasks.map(async (task) => {
            const [project, assignee] = await Promise.all([
                db_1.default.project.findUnique({
                    where: { id: task.projectId },
                }),
                task.assignedTo
                    ? db_1.default.user.findUnique({
                        where: { id: task.assignedTo },
                    })
                    : Promise.resolve(null),
            ]);
            if (!project) {
                throw new Error('Project not found');
            }
            return {
                ...task,
                status: task.status,
                priority: task.priority,
                assignee: assignee
                    ? {
                        id: assignee.id,
                        email: assignee.email,
                        name: assignee.name,
                        avatarUrl: assignee.avatarUrl,
                        createdAt: assignee.createdAt,
                        updatedAt: assignee.updatedAt,
                    }
                    : null,
                project: {
                    ...project,
                    status: project.status,
                },
            };
        }));
    }
    /**
     * Private helper: Enrich task with assignee info
     *
     * @param task - Task from database
     * @returns Task with enriched assignee info
     * @private
     */
    static async enrichTaskWithAssignee(task) {
        const assignee = task.assignedTo
            ? await db_1.default.user.findUnique({
                where: { id: task.assignedTo },
            })
            : null;
        return {
            ...task,
            status: task.status,
            priority: task.priority,
            assignee: assignee
                ? {
                    id: assignee.id,
                    email: assignee.email,
                    name: assignee.name,
                    avatarUrl: assignee.avatarUrl,
                    createdAt: assignee.createdAt,
                    updatedAt: assignee.updatedAt,
                }
                : null,
        };
    }
}
exports.TaskService = TaskService;
// Export default for compatibility with default imports
exports.default = TaskService;
