import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';
import { ActivityService } from '../services/activity.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { AuthzService } from '../services/authz.service';
import { CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority, TaskFilterParams, BulkUpdateTaskRequest } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class TaskController {
  static createTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { projectId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const canAccess = await ProjectService.canAccessProject(projectId, userId);
    if (!canAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const data: CreateTaskRequest = req.body;
    const task = await TaskService.createTask(projectId, userId, data);

    if (task) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
      const wsId = project?.workspaceId;

      if (data.assignedTo) {
        await NotificationService.notify({
          recipientId: data.assignedTo,
          actorId: userId,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `assigned task "${task.title}" to you`,
          taskId: task.id,
          projectId,
          workspaceId: wsId,
        });
      }

      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${projectId}`).emit('task:created', { task });
      }, 'socket:task:created');
    }

    sendSuccess(res, task, 201);
  });

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

    await AuthzService.requireProjectAccess(task.projectId, userId);

    sendSuccess(res, task);
  });

  static listTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  const { projectId } = req.params;

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

  const result = await TaskService.getProjectTasks(
    projectId,
    userId,
    filters
  );

  sendSuccess(res, result);
});

  static updateTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: UpdateTaskRequest = req.body;
    const oldTask = await TaskService.getTaskById(id);
    const task = await TaskService.updateTask(id, userId, data);

    if (task) {
      const wsId = oldTask?.project?.workspaceId;

      const newAssigneeId = task.assignedTo;
      const oldAssigneeId = oldTask?.assignedTo;
      const assigneeChanged = newAssigneeId !== oldAssigneeId && (data.assignedTo !== undefined || data.assigneeId !== undefined);

      let notified = false;

      if (data.status && oldTask && oldTask.status !== data.status) {
        notified = true;
        const targets = new Set<string>();
        if (task.assignedTo) targets.add(task.assignedTo);
        if (task.assignedTo !== userId) targets.add(userId);
        for (const t of targets) {
          await NotificationService.notify({
            recipientId: t, actorId: userId,
            type: 'status_changed', title: 'Status Changed',
            message: `moved "${task.title}" from ${oldTask!.status.replace(/_/g, ' ')} to ${data.status!.replace(/_/g, ' ')}`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      if (data.priority && oldTask && oldTask.priority !== data.priority) {
        notified = true;
        const targets = new Set<string>();
        if (task.assignedTo) targets.add(task.assignedTo);
        if (task.assignedTo !== userId) targets.add(userId);
        for (const t of targets) {
          await NotificationService.notify({
            recipientId: t, actorId: userId,
            type: 'priority_changed', title: 'Priority Changed',
            message: `changed priority of "${task.title}" to ${data.priority}`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      if (data.dueDate !== undefined && oldTask && oldTask.dueDate !== data.dueDate) {
        const newDateStr = data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : null;
        const oldDateStr = oldTask.dueDate ? new Date(oldTask.dueDate).toISOString().split('T')[0] : null;
        if (newDateStr !== oldDateStr) {
          notified = true;
          const targets = new Set<string>();
          if (task.assignedTo) targets.add(task.assignedTo);
          if (task.assignedTo !== userId) targets.add(userId);
          for (const t of targets) {
            await NotificationService.notify({
              recipientId: t, actorId: userId,
              type: 'due_date_changed', title: 'Due Date Changed',
              message: `changed due date of "${task.title}"`,
              taskId: task.id, projectId: task.projectId, workspaceId: wsId,
            });
          }
        }
      }

      if (assigneeChanged) {
        notified = true;
        if (oldAssigneeId) {
          await NotificationService.notify({
            recipientId: oldAssigneeId, actorId: userId,
            type: 'task_unassigned', title: 'Task Unassigned',
            message: `unassigned you from "${task.title}"`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
        if (newAssigneeId) {
          await NotificationService.notify({
            recipientId: newAssigneeId, actorId: userId,
            type: 'task_assigned', title: 'Task Assigned',
            message: `assigned "${task.title}" to you`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      if (data.title && oldTask && data.title !== oldTask.title) {
        notified = true;
        const targets = new Set<string>();
        if (task.assignedTo) targets.add(task.assignedTo);
        if (task.assignedTo !== userId) targets.add(userId);
        for (const t of targets) {
          await NotificationService.notify({
            recipientId: t, actorId: userId,
            type: 'title_changed', title: 'Title Changed',
            message: `renamed "${oldTask.title}" to "${data.title}"`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      if (!notified && !assigneeChanged) {
        const targets = new Set<string>();
        if (task.assignedTo) targets.add(task.assignedTo);
        if (task.assignedTo !== userId) targets.add(userId);
        for (const t of targets) {
          await NotificationService.notify({
            recipientId: t, actorId: userId,
            type: 'task_updated', title: 'Task Updated',
            message: `updated "${task.title}"`,
            taskId: task.id, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('task:updated', { task });
        if (assigneeChanged) {
          io.to(`project:${task.projectId}`).emit('task:assigned', { taskId: task.id, assigneeId: newAssigneeId });
        }
      }, 'socket:task:updated');
    }

    sendSuccess(res, task);
  });

  static updateTaskStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.updateTaskStatus(id, userId, status);

    if (task) {
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
      const wsId = project?.workspaceId;
      const targets = new Set<string>();
      if (task.assignedTo) targets.add(task.assignedTo);
      if (task.assignedTo !== userId) targets.add(userId);
      for (const t of targets) {
        await NotificationService.notify({
          recipientId: t, actorId: userId,
          type: 'status_changed', title: 'Status Changed',
          message: `moved "${task.title}" to ${status.replace(/_/g, ' ')}`,
          taskId: task.id, projectId: task.projectId, workspaceId: wsId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('task:updated', { task });
      }, 'socket:task:updated');
    }

    sendSuccess(res, task);
  });

  static assignTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.assignTask(id, userId, assignedTo || null);

    if (task && assignedTo) {
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
      const wsId = project?.workspaceId;
      await NotificationService.notify({
        recipientId: assignedTo, actorId: userId,
        type: 'task_assigned', title: 'Task Assigned',
        message: `assigned task "${task.title}" to you`,
        taskId: task.id, projectId: task.projectId, workspaceId: wsId,
      });
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('task:assigned', { taskId: task.id, assigneeId: assignedTo });
      }, 'socket:task:assigned');
    }

    sendSuccess(res, task);
  });

  static deleteTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const taskInfo = await prisma.task.findUnique({
      where: { id },
      select: { title: true, projectId: true, assignedTo: true, project: { select: { workspaceId: true } } },
    });

    await TaskService.deleteTask(id, userId);

    if (taskInfo) {
      const wsId = taskInfo.project?.workspaceId;
      if (taskInfo.assignedTo) {
        await NotificationService.notify({
          recipientId: taskInfo.assignedTo, actorId: userId,
          type: 'task_deleted', title: 'Task Deleted',
          message: `deleted "${taskInfo.title}"`,
          taskId: id, projectId: taskInfo.projectId, workspaceId: wsId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${taskInfo.projectId}`).emit('task:deleted', { taskId: id });
      }, 'socket:task:deleted');
    }

    res.status(204).send();
  });

  static reorderTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { newPosition } = req.body;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.reorderTask(id, userId, newPosition);

    sendSuccess(res, task);
  });

  static bulkUpdateTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const data: BulkUpdateTaskRequest = {
      taskIds: req.body.taskIds,
      status: req.body.status as TaskStatus | undefined,
      priority: req.body.priority as TaskPriority | undefined,
      assignedTo: req.body.assignedTo,
    };
    const tasks = await TaskService.bulkUpdateTasks(data, userId);

    if (tasks.length > 0) {
      const projectId = req.params.projectId;
      await safeSideEffect(async () => {
        const actor = await NotificationService.getUserInfo(userId);
        const io = getIo();
        io.to(`project:${projectId}`).emit('task:bulk-updated', { taskIds: data.taskIds, updates: data, actor: { id: actor.id, name: actor.name } });
      }, 'socket:task:bulk-updated');
    }

    sendSuccess(res, tasks);
  });

  static bulkDeleteTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { taskIds }: { taskIds: string[] } = req.body;
    const count = await TaskService.bulkDeleteTasks(taskIds, userId);

    const projectId = req.params.projectId;
    await safeSideEffect(async () => {
      const io = getIo();
      io.to(`project:${projectId}`).emit('task:bulk-deleted', { taskIds, count });
    }, 'socket:task:bulk-deleted');

    sendSuccess(res, { deletedCount: count });
  });

  static getAssignedTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const status = req.query.status as TaskStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const workspaceId = req.query.workspaceId as string | undefined;

    const result = await TaskService.getUserTasks(userId, status, page, limit, workspaceId);

    sendSuccess(res, result);
  });

  static getOverdueTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const workspaceId = req.query.workspaceId as string | undefined;
    const tasks = await TaskService.getOverdueTasks(userId, limit, workspaceId);

    sendSuccess(res, tasks);
  });

  static getTaskActivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await AuthzService.requireTaskAccess(taskId, userId);
    const activity = await ActivityService.getTaskActivity(taskId);

    sendSuccess(res, activity);
  });
}
