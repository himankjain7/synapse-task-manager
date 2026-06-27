import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';
import { TaskService } from '../services/task.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { AuthzService } from '../services/authz.service';
import { CreateCommentRequest, UpdateCommentRequest } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { safeSideEffect } from '../utils/safeSideEffect';

export class CommentController {
  static createComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const data: CreateCommentRequest & { parentId?: string } = req.body;
    const comment = await CommentService.createComment(taskId, userId, data);

    if (comment) {
      const wsId = task.project?.workspaceId;

      const targets = new Set<string>();
      if (task.assignedTo) targets.add(task.assignedTo);
      for (const t of targets) {
        await NotificationService.notify({
          recipientId: t, actorId: userId,
          type: 'comment_added', title: 'New Comment',
          message: `commented on "${task.title}"`,
          taskId, projectId: task.projectId, workspaceId: wsId,
        });
      }

      if (data.parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: data.parentId },
          select: { userId: true },
        });
        if (parentComment && parentComment.userId !== userId) {
          await NotificationService.notify({
            recipientId: parentComment.userId, actorId: userId,
            type: 'comment_replied', title: 'New Reply',
            message: `replied to your comment on "${task.title}"`,
            taskId, projectId: task.projectId, workspaceId: wsId,
          });
        }
      }

      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${task.projectId}`).emit('comment:added', { comment });
      }, 'socket:comment:added');
    }

    sendSuccess(res, comment, 201);
  });

  static addReaction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string') {
      throw new APIError(400, 'VALIDATION_ERROR', 'emoji is required');
    }

    const reaction = await CommentService.addReaction(id, userId, emoji);

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { task: { select: { projectId: true } } },
    });
    if (comment) {
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${comment.task.projectId}`).emit('comment:reacted', { commentId: id, reaction });
      }, 'socket:comment:reacted');
    }

    sendSuccess(res, reaction, 201);
  });

  static removeReaction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id, emoji } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await CommentService.removeReaction(id, userId, emoji);

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { task: { select: { projectId: true } } },
    });
    if (comment) {
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${comment.task.projectId}`).emit('comment:unreacted', { commentId: id, userId, emoji });
      }, 'socket:comment:unreacted');
    }

    sendSuccess(res, null);
  });

  static getComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const comment = await CommentService.getCommentById(id);
    if (!comment) {
      throw new NotFoundError('Comment', id);
    }

    await AuthzService.requireTaskAccess(comment.taskId, userId);

    sendSuccess(res, comment);
  });

  static listComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { taskId } = req.params;

    const result = await CommentService.getTaskComments(taskId, userId, page, limit);

    sendSuccess(res, result);
  });

  static updateComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const canEdit = await CommentService.canEditComment(id, userId);
    if (!canEdit) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    const commentData = await prisma.comment.findUnique({ where: { id }, select: { taskId: true } });
    let taskInfo: { title: string; projectId: string; assignedTo: string | null; project: { workspaceId: string } | null } | null = null;
    if (commentData) {
      const t = await TaskService.getTaskById(commentData.taskId);
      if (t) {
        taskInfo = { title: t.title, projectId: t.projectId, assignedTo: t.assignedTo, project: t.project ? { workspaceId: t.project.workspaceId } : null };
      }
    }

    const data: UpdateCommentRequest = req.body;
    const comment = await CommentService.updateComment(id, userId, data);

    if (taskInfo) {
      const targets = new Set<string>();
      if (taskInfo.assignedTo) targets.add(taskInfo.assignedTo);
      for (const t of targets) {
        await NotificationService.notify({
          recipientId: t, actorId: userId,
          type: 'comment_updated', title: 'Comment Updated',
          message: `updated a comment on "${taskInfo.title}"`,
          taskId: commentData?.taskId, projectId: taskInfo.projectId, workspaceId: taskInfo.project?.workspaceId,
        });
      }
    }

    sendSuccess(res, comment);
  });

  static deleteComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const canEdit = await CommentService.canEditComment(id, userId);
    if (!canEdit) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    const commentData = await prisma.comment.findUnique({ where: { id }, select: { taskId: true, content: true } });
    let taskInfo: { title: string; projectId: string; assignedTo: string | null; project: { workspaceId: string } | null } | null = null;
    if (commentData) {
      const t = await TaskService.getTaskById(commentData.taskId);
      if (t) {
        taskInfo = { title: t.title, projectId: t.projectId, assignedTo: t.assignedTo, project: t.project ? { workspaceId: t.project.workspaceId } : null };
      }
    }

    await CommentService.deleteComment(id, userId);

    if (taskInfo) {
      const targets = new Set<string>();
      if (taskInfo.assignedTo) targets.add(taskInfo.assignedTo);
      for (const t of targets) {
        await NotificationService.notify({
          recipientId: t, actorId: userId,
          type: 'comment_deleted', title: 'Comment Deleted',
          message: `deleted a comment on "${taskInfo.title}"`,
          taskId: commentData?.taskId, projectId: taskInfo.projectId, workspaceId: taskInfo.project?.workspaceId,
        });
      }
      await safeSideEffect(async () => {
        const io = getIo();
        io.to(`project:${taskInfo.projectId}`).emit('comment:deleted', { commentId: id, taskId: commentData?.taskId });
      }, 'socket:comment:deleted');
    }

    res.status(204).send();
  });

  static getUserComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const workspaceId = req.query.workspaceId as string | undefined;

    const result = await CommentService.getUserComments(userId, page, limit, workspaceId);

    sendSuccess(res, result);
  });

  static getActivityFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      throw new APIError(400, 'VALIDATION_ERROR', 'workspaceId query parameter is required');
    }

    await AuthzService.requireWorkspaceAccess(workspaceId, userId);

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const comments = await CommentService.getRecentComments(workspaceId, userId, limit);

    sendSuccess(res, comments);
  });

  static getCommentCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    await AuthzService.requireTaskAccess(taskId, userId);
    const count = await CommentService.getCommentCount(taskId);

    sendSuccess(res, { count });
  });
}
