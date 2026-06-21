import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';
import { TaskService } from '../services/task.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { CreateCommentRequest, UpdateCommentRequest } from '../models';
import prisma from '../config/db';
import { getIo } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { makeNotif, getUserInfo } from '../utils/notification';

/**
 * Comment Controller
 *
 * Handles HTTP requests for comment operations:
 * - Create/read/update/delete comments on tasks
 * - Get comments for specific task
 * - Get all comments by user
 * - Get activity feed with recent comments
 *
 * All operations require workspace membership and task access.
 */
export class CommentController {
  /**
   * POST /tasks/:taskId/comments
   * Create a new comment on a task
   *
   * Request body:
   * {
   *   content: string (required, 1-5000 chars)
   * }
   *
   * Response: 201 Created
   * Comment object with author information
   *
   * Errors:
   * - 400: Invalid input
   * - 404: Task not found
   */
  static createComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { taskId } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Verify task exists
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const data: CreateCommentRequest = req.body;
    const comment = await CommentService.createComment(taskId, userId, data);

    if (comment) {
      const io = getIo();
      const actor = await getUserInfo(userId);
      const wsId = task.project?.workspaceId;

      const payload = makeNotif(uuidv4(), 'comment_added', 'New Comment',
        `${actor.name} commented on "${task.title}"`,
        actor, taskId, task.projectId, wsId);
      if (task.assignedTo) {
        io.to(`user:${task.assignedTo}`).emit('notification', payload);
        if (task.assignedTo !== userId) {
          io.to(`user:${userId}`).emit('notification', payload);
        }
      } else {
        io.to(`user:${userId}`).emit('notification', payload);
      }
      io.to(`project:${task.projectId}`).emit('comment:added', { comment });
    }

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment created',
      timestamp: new Date(),
    });
  });

  /**
   * GET /tasks/:taskId/comments/:id
   * Get single comment details
   *
   * Response: 200 OK
   * Comment object with author information
   */
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

    res.status(200).json({
      success: true,
      data: comment,
      timestamp: new Date(),
    });
  });

  /**
   * GET /tasks/:taskId/comments
   * List comments on a task with pagination
   *
   * Query params:
   * - page: number (default 1)
   * - limit: number (default 20)
   *
   * Response: 200 OK
   * Paginated list of comments (chronological order)
   */
  static listComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { taskId } = req.params;

const result = await CommentService.getTaskComments(
  taskId,
  userId,
  page,
  limit
);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date(),
  });
});

  /**
   * PATCH /tasks/:taskId/comments/:id
   * Update a comment
   *
   * Only the comment author can edit.
   *
   * Request body:
   * {
   *   content: string (1-5000 chars)
   * }
   *
   * Response: 200 OK
   * Updated comment object
   *
   * Errors:
   * - 403: Not comment author
   * - 404: Comment not found
   */
  static updateComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check if user can edit this comment
    const canEdit = await CommentService.canEditComment(id, userId);
    if (!canEdit) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    // Get task context for notification before returning
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
      const io = getIo();
      const actor = await getUserInfo(userId);
      const payload = makeNotif(uuidv4(), 'comment_updated', 'Comment Updated',
        `${actor.name} updated a comment on "${taskInfo.title}"`,
        actor, commentData?.taskId, taskInfo.projectId, taskInfo.project?.workspaceId);
      if (taskInfo.assignedTo) {
        io.to(`user:${taskInfo.assignedTo}`).emit('notification', payload);
        if (taskInfo.assignedTo !== userId) {
          io.to(`user:${userId}`).emit('notification', payload);
        }
      } else {
        io.to(`user:${userId}`).emit('notification', payload);
      }
    }

    res.status(200).json({
      success: true,
      data: comment,
      message: 'Comment updated',
      timestamp: new Date(),
    });
  });

  /**
   * DELETE /tasks/:taskId/comments/:id
   * Delete a comment
   *
   * Only the comment author can delete.
   *
   * Response: 204 No Content
   *
   * Errors:
   * - 403: Not comment author
   * - 404: Comment not found
   */
  static deleteComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check if user can delete this comment
    const canEdit = await CommentService.canEditComment(id, userId);
    if (!canEdit) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Fetch comment + task for notification before deletion
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
      const io = getIo();
      const actor = await getUserInfo(userId);
      const payload = makeNotif(uuidv4(), 'comment_deleted', 'Comment Deleted',
        `${actor.name} deleted a comment on "${taskInfo.title}"`,
        actor, commentData?.taskId, taskInfo.projectId, taskInfo.project?.workspaceId);
      if (taskInfo.assignedTo) {
        io.to(`user:${taskInfo.assignedTo}`).emit('notification', payload);
        if (taskInfo.assignedTo !== userId) {
          io.to(`user:${userId}`).emit('notification', payload);
        }
      } else {
        io.to(`user:${userId}`).emit('notification', payload);
      }
      io.to(`project:${taskInfo.projectId}`).emit('comment:deleted', { commentId: id, taskId: commentData?.taskId });
    }

    res.status(204).send();
  });

  /**
   * GET /comments/my
   * Get all comments by current user with pagination
   *
   * Query params:
   * - page: number (default 1)
   * - limit: number (default 20)
   *
   * Response: 200 OK
   * Paginated list of user's comments
   */
  static getUserComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await CommentService.getUserComments(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  });

  /**
   * GET /workspaces/:workspaceId/activity
   * Get recent comments activity feed for a workspace
   *
   * Query params:
   * - limit: number (default 20, max 50)
   *
   * Response: 200 OK
   * List of recent comments with task and project context
   */
  static getActivityFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const workspaceId = req.query.workspaceId as string;

  if (!workspaceId) {
    throw new APIError(
      400,
      'VALIDATION_ERROR',
      'workspaceId query parameter is required'
    );
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const comments = await CommentService.getRecentComments(
    workspaceId,
    userId,
    limit
  );

  res.status(200).json({
    success: true,
    data: comments,
    timestamp: new Date(),
  });
});

  /**
   * GET /tasks/:taskId/comments/count
   * Get comment count for a task
   *
   * Useful for UI badges.
   *
   * Response: 200 OK
   * {
   *   count: number
   * }
   */
  static getCommentCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

if (!taskId) {
  throw new APIError(
    400,
    'VALIDATION_ERROR',
    'taskId query parameter is required'
  );
}

    const count = await CommentService.getCommentCount(taskId);

    res.status(200).json({
      success: true,
      data: { count },
      timestamp: new Date(),
    });
  });
}

