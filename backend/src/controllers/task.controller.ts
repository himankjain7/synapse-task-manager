import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority, TaskFilterParams } from '../models';

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
export class TaskController {
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
  static createTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { projectId } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify project access
    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const data: CreateTaskRequest = req.body;
    const task = await TaskService.createTask(projectId, userId, data);

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
  static getTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.getTaskById(id);
    if (!task) {
      throw new NotFoundError('Task', id);
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
   static listTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const filters: TaskFilterParams = {
    status: req.query.status as TaskStatus | undefined,
    priority: req.query.priority as TaskPriority | undefined,
    assignedTo: req.query.assignedTo as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await TaskService.getUserTasks(
    userId,
    filters.status,
    filters.page,
    filters.limit

  );

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
  static updateTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: UpdateTaskRequest = req.body;
    const task = await TaskService.updateTask(id, userId, data);

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
  static updateTaskStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.updateTaskStatus(id, status);

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
  static assignTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.assignTask(id, assignedTo || null);

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
  static deleteTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await TaskService.deleteTask(id, userId);

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
  static reorderTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { newPosition } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.reorderTask(id, newPosition);

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
  static bulkUpdateTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { updates } = req.body;
    const tasks = await TaskService.bulkUpdateTasks(updates);

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
  static getAssignedTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const status = req.query.status as TaskStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await TaskService.getUserTasks(userId, status, page, limit);

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
  static getOverdueTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const tasks = await TaskService.getOverdueTasks(limit);

    res.status(200).json({
      success: true,
      data: tasks,
      timestamp: new Date(),
    });
  });
}

