"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const task_service_1 = require("../services/task.service");
const project_service_1 = require("../services/project.service");
const activity_service_1 = require("../services/activity.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
/**
 * Task Controller
 *
 * Handles HTTP requests for task operations:
 * - Create/read/update/delete tasks
 * - Assign/unassign tasks
 * - Update task status and priority
 * - Reorder tasks (drag-and-drop)
 * - Bulk update tasks
 *
 * All operations require workspace membership.
 */
const getUserName = async (userId) => {
    const user = await db_1.default.user.findUnique({ where: { id: userId }, select: { name: true } });
    return user?.name || userId;
};
const makeNotif = (id, type, title, message, taskId, projectId, workspaceId) => ({
    id, type, title, message, taskId, projectId, workspaceId, createdAt: new Date().toISOString(),
});
class TaskController {
    /**
     * POST /projects/:projectId/tasks
     * Create a new task
     *
     * Request body:
     * {
     *   title: string (required, 1-200 chars),
     *   description?: string,
     *   priority?: 'low' | 'medium' | 'high' | 'urgent',
     *   assignedTo?: string (user ID),
     *   dueDate?: Date,
     *   estimatedHours?: number
     * }
     *
     * Response: 201 Created
     * Task object with assignee details
     */
    static createTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { projectId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        // Verify project access
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess) {
            throw new error_middleware_2.ForbiddenError('You do not have access to this project');
        }
        const data = req.body;
        const task = await task_service_1.TaskService.createTask(projectId, userId, data);
        if (task) {
            const io = (0, socket_1.getIo)();
            const actorName = await getUserName(userId);
            const project = await db_1.default.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
            const wsId = project?.workspaceId;
            const targetUser = data.assignedTo || userId;
            const assigneeName = data.assignedTo ? await getUserName(data.assignedTo) : actorName;
            const payload = makeNotif((0, uuid_1.v4)(), 'task_assigned', 'Task Assigned', `${actorName} assigned task "${task.title}" to ${assigneeName}`, task.id, projectId, wsId);
            io.to(`user:${targetUser}`).emit('notification', payload);
            // Broadcast to project room
            io.to(`project:${projectId}`).emit('task:created', { task });
        }
        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created',
            timestamp: new Date(),
        });
    });
    /**
     * GET /projects/:projectId/tasks/:id
     * Get task details
     *
     * Response: 200 OK
     * Task object with assignee and project information
     */
    static getTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const task = await task_service_1.TaskService.getTaskById(id);
        if (!task) {
            throw new error_middleware_2.NotFoundError('Task', id);
        }
        res.status(200).json({
            success: true,
            data: task,
            timestamp: new Date(),
        });
    });
    /**
     * GET /projects/:projectId/tasks
     * List tasks in project with filtering
     *
     * Query params:
     * - status?: 'todo' | 'in_progress' | 'done'
     * - priority?: 'low' | 'medium' | 'high' | 'urgent'
     * - assignedTo?: user ID
     * - page: number (default 1)
     * - limit: number (default 20)
     *
     * Response: 200 OK
     * Paginated list of tasks
     */
    static listTasks = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { projectId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const filters = {
            status: req.query.status,
            priority: req.query.priority,
            assignedTo: req.query.assignedTo,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        };
        const result = await task_service_1.TaskService.getProjectTasks(projectId, userId, filters);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /projects/:projectId/tasks/:id
     * Update task details
     *
     * Request body:
     * {
     *   title?: string,
     *   description?: string,
     *   priority?: string,
     *   dueDate?: Date,
     *   estimatedHours?: number
     * }
     *
     * Response: 200 OK
     * Updated task object
     */
    static updateTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const data = req.body;
        const oldTask = await task_service_1.TaskService.getTaskById(id);
        const task = await task_service_1.TaskService.updateTask(id, userId, data);
        if (task) {
            const io = (0, socket_1.getIo)();
            const actorName = await getUserName(userId);
            const wsId = oldTask?.project?.workspaceId;
            const targetUser = task.assignedTo || userId;
            if (data.status && oldTask && oldTask.status !== data.status) {
                io.to(`user:${targetUser}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'status_changed', 'Status Changed', `${actorName} moved "${task.title}" from ${oldTask.status.replace(/_/g, ' ')} to ${data.status.replace(/_/g, ' ')}`, task.id, task.projectId, wsId));
            }
            else if (data.priority && oldTask && oldTask.priority !== data.priority) {
                io.to(`user:${targetUser}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'priority_changed', 'Priority Changed', `${actorName} changed priority of "${task.title}" to ${data.priority}`, task.id, task.projectId, wsId));
            }
            else if (data.dueDate && oldTask && oldTask.dueDate !== data.dueDate) {
                io.to(`user:${targetUser}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'due_date_changed', 'Due Date Changed', `${actorName} changed due date of "${task.title}"`, task.id, task.projectId, wsId));
            }
            else {
                io.to(`user:${targetUser}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'task_updated', 'Task Updated', `${actorName} updated "${task.title}"`, task.id, task.projectId, wsId));
            }
            // Broadcast task:updated to project room
            io.to(`project:${task.projectId}`).emit('task:updated', { task });
        }
        res.status(200).json({
            success: true,
            data: task,
            message: 'Task updated',
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /projects/:projectId/tasks/:id/status
     * Update task status quickly
     *
     * Request body:
     * {
     *   status: 'todo' | 'in_progress' | 'done'
     * }
     *
     * Response: 200 OK
     * Updated task object
     */
    static updateTaskStatus = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { status } = req.body;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const task = await task_service_1.TaskService.updateTaskStatus(id, userId, status);
        if (task) {
            const io = (0, socket_1.getIo)();
            const project = await db_1.default.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
            const wsId = project?.workspaceId;
            const targetUser = task.assignedTo || userId;
            const actorName = await getUserName(userId);
            const payload = makeNotif((0, uuid_1.v4)(), 'status_changed', 'Status Changed', `${actorName} moved "${task.title}" to ${status.replace(/_/g, ' ')}`, task.id, task.projectId, wsId);
            io.to(`user:${targetUser}`).emit('notification', payload);
            io.to(`project:${task.projectId}`).emit('task:updated', { task });
        }
        res.status(200).json({
            success: true,
            data: task,
            message: 'Task status updated',
            timestamp: new Date(),
        });
    });
    /**
     * PATCH /projects/:projectId/tasks/:id/assign
     * Assign or unassign task
     *
     * Request body:
     * {
     *   assignedTo: string | null (user ID or null to unassign)
     * }
     *
     * Response: 200 OK
     * Updated task object
     */
    static assignTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { assignedTo } = req.body;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const task = await task_service_1.TaskService.assignTask(id, userId, assignedTo || null);
        if (task && assignedTo) {
            const io = (0, socket_1.getIo)();
            const actorName = await getUserName(userId);
            const assigneeName = await getUserName(assignedTo);
            const project = await db_1.default.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
            const wsId = project?.workspaceId;
            // Notify the newly assigned user
            io.to(`user:${assignedTo}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'task_assigned', 'Task Assigned', `${actorName} assigned task "${task.title}" to ${assigneeName}`, task.id, task.projectId, wsId));
            // Also notify the actor if they're not the assignee
            if (assignedTo !== userId) {
                io.to(`user:${userId}`).emit('notification', makeNotif((0, uuid_1.v4)(), 'task_assigned', 'Task Assigned', `${actorName} assigned task "${task.title}" to ${assigneeName}`, task.id, task.projectId, wsId));
            }
            io.to(`project:${task.projectId}`).emit('task:assigned', { taskId: task.id, assigneeId: assignedTo });
        }
        res.status(200).json({
            success: true,
            data: task,
            message: 'Task assignment updated',
            timestamp: new Date(),
        });
    });
    /**
     * DELETE /projects/:projectId/tasks/:id
     * Delete task
     *
     * Response: 204 No Content
     */
    static deleteTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        await task_service_1.TaskService.deleteTask(id, userId);
        res.status(204).send();
    });
    /**
     * PATCH /projects/:projectId/tasks/:id/reorder
     * Reorder task (drag-and-drop)
     *
     * Request body:
     * {
     *   newPosition: number
     * }
     *
     * Response: 200 OK
     * Updated task object
     */
    static reorderTask = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { newPosition } = req.body;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const task = await task_service_1.TaskService.reorderTask(id, newPosition);
        res.status(200).json({
            success: true,
            data: task,
            message: 'Task reordered',
            timestamp: new Date(),
        });
    });
    /**
     * POST /projects/:projectId/tasks/bulk-update
     * Update multiple tasks at once
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
    static bulkUpdateTasks = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const { updates } = req.body;
        const tasks = await task_service_1.TaskService.bulkUpdateTasks(updates);
        res.status(200).json({
            success: true,
            data: tasks,
            message: 'Tasks updated',
            timestamp: new Date(),
        });
    });
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
     * Paginated list of assigned tasks
     */
    static getAssignedTasks = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await task_service_1.TaskService.getUserTasks(userId, status, page, limit);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date(),
        });
    });
    /**
     * GET /tasks/overdue
     * Get overdue tasks for current user
     *
     * Query params:
     * - limit: number (default 10, max 50)
     *
     * Response: 200 OK
     * List of overdue tasks
     */
    static getOverdueTasks = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const tasks = await task_service_1.TaskService.getOverdueTasks(limit);
        res.status(200).json({
            success: true,
            data: tasks,
            timestamp: new Date(),
        });
    });
    /**
     * GET /tasks/:taskId/activity
     * Get activity log for a task
     *
     * Response: 200 OK
     * Array of activity log entries (newest first)
     */
    static getTaskActivity = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { taskId } = req.params;
        if (!userId) {
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        }
        const activity = await activity_service_1.ActivityService.getTaskActivity(taskId);
        res.status(200).json({
            success: true,
            data: activity,
            timestamp: new Date(),
        });
    });
}
exports.TaskController = TaskController;
