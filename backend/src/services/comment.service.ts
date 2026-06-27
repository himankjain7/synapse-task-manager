import prisma from '../config/db';
import { ProjectService } from './project.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import {
  CommentWithUser,
  CommentWithRelations,
  CommentReactionResponse,
  CreateCommentRequest,
  CreateReplyRequest,
  UpdateCommentRequest,
  PaginatedResponse,
} from '../models';

function buildUserResponse(user: { id: string; email: string; name: string; avatarUrl: string | null; provider?: string; emailVerified?: boolean; createdAt: Date; updatedAt: Date }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: user.provider ?? 'email', emailVerified: user.emailVerified ?? false, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

function extractMentions(content: string): string[] {
  const mentions: string[] = [];
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[2]);
  }
  return mentions;
}

function enrichComment(comment: any, user: any): CommentWithUser {
  return { ...comment, user: buildUserResponse(user) };
}

async function fetchReactions(commentId: string): Promise<CommentReactionResponse[]> {
  return prisma.commentReaction.findMany({
    where: { commentId },
    include: { user: { select: { id: true, name: true } } },
  });
}

async function fetchReplies(commentId: string): Promise<CommentWithRelations[]> {
  const replies = await prisma.comment.findMany({
    where: { parentId: commentId },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(replies.map(async (reply) => {
    const user = await prisma.user.findUnique({ where: { id: reply.userId } });
    if (!user) throw new Error(`User ${reply.userId} not found`);
    const reactions = await fetchReactions(reply.id);
    return { ...enrichComment(reply, user), reactions } as CommentWithRelations;
  }));
}

export class CommentService {
  static async createComment(
    taskId: string,
    userId: string,
    data: CreateCommentRequest & { parentId?: string | null }
  ): Promise<CommentWithUser> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) throw new Error('Permission denied: not a member of this workspace');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId,
        parentId: data.parentId || null,
        content: data.content.trim(),
        createdAt: new Date(),
      },
    });

    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      await ActivityService.log({
        workspaceId: project.workspaceId,
        taskId,
        userId,
        action: 'comment_created',
        details: { content: data.content.trim().substring(0, 200) },
      });
    }

    const mentionedUserIds = extractMentions(data.content);
    for (const mentionedId of mentionedUserIds) {
      if (mentionedId !== userId && project) {
        await NotificationService.notify({
          recipientId: mentionedId,
          actorId: userId,
          type: 'comment_mention',
          title: 'You were mentioned',
          message: `mentioned you in a comment on "${task.title}"`,
          taskId,
          projectId: task.projectId,
          workspaceId: project.workspaceId,
          metadata: { commentId: comment.id },
        });
      }
    }

    return enrichComment(comment, user);
  }

  static async createReply(
    taskId: string,
    userId: string,
    parentCommentId: string,
    data: CreateReplyRequest
  ): Promise<CommentWithUser> {
    const parent = await prisma.comment.findUnique({ where: { id: parentCommentId } });
    if (!parent) throw new Error('Parent comment not found');

    return this.createComment(taskId, userId, { taskId, content: data.content, parentId: parentCommentId });
  }

  static async getCommentById(commentId: string): Promise<CommentWithRelations | null> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return null;

    const user = await prisma.user.findUnique({ where: { id: comment.userId } });
    if (!user) throw new Error('Comment author not found');

    const reactions = await fetchReactions(commentId);
    return { ...enrichComment(comment, user), reactions } as CommentWithRelations;
  }

  static async getTaskComments(
    taskId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<CommentWithRelations>> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    const canAccess = await ProjectService.canAccessProject(task.projectId, userId);
    if (!canAccess) throw new Error('Permission denied: not a member of this workspace');

    const parentComments = await prisma.comment.findMany({
      where: { taskId, parentId: null },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const total = await prisma.comment.count({ where: { taskId, parentId: null } });

    const enrichedComments = await Promise.all(
      parentComments.map(async (comment) => {
        const user = await prisma.user.findUnique({ where: { id: comment.userId } });
        if (!user) throw new Error(`User ${comment.userId} not found`);
        const replies = await fetchReplies(comment.id);
        const reactions = await fetchReactions(comment.id);
        return { ...enrichComment(comment, user), replies, reactions } as CommentWithRelations;
      })
    );

    return {
      data: enrichedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentRequest
  ): Promise<CommentWithUser> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');
    if (comment.userId !== userId) throw new Error('Permission denied: only comment author can edit');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: data.content.trim(), updatedAt: new Date() },
    });

    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      include: { project: true },
    });
    if (task) {
      await ActivityService.log({
        workspaceId: task.project.workspaceId,
        taskId: comment.taskId,
        userId,
        action: 'comment_updated',
        details: { commentId: comment.id },
      });
    }

    return enrichComment(updated, user);
  }

  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');
    if (comment.userId !== userId) throw new Error('Permission denied: only comment author can delete');

    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      include: { project: true },
    });
    if (task) {
      await ActivityService.log({
        workspaceId: task.project.workspaceId,
        taskId: comment.taskId,
        userId,
        action: 'comment_deleted',
        details: { commentId: comment.id, content: comment.content.substring(0, 200) },
      });
    }

    await prisma.comment.deleteMany({ where: { parentId: commentId } });
    await prisma.comment.delete({ where: { id: commentId } });
  }

  static async addReaction(commentId: string, userId: string, emoji: string): Promise<CommentReactionResponse> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');

    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
    });
    if (existing) throw new Error('Reaction already exists');

    const reaction = await prisma.commentReaction.create({
      data: { commentId, userId, emoji, createdAt: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });

    return reaction;
  }

  static async removeReaction(commentId: string, userId: string, emoji: string): Promise<void> {
    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
    });
    if (!existing) throw new Error('Reaction not found');

    await prisma.commentReaction.delete({ where: { id: existing.id } });
  }

  static async getUserComments(
    userId: string,
    page: number = 1,
    limit: number = 50,
    workspaceId?: string
  ): Promise<PaginatedResponse<CommentWithUser>> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const where: any = { userId };
    if (workspaceId) {
      const projects = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);
      const tasks = await prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true },
      });
      where.taskId = { in: tasks.map((t) => t.id) };
    }

    const comments = await prisma.comment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.comment.count({ where });

    return {
      data: comments.map((c) => enrichComment(c, user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getCommentCount(taskId: string): Promise<number> {
    return prisma.comment.count({ where: { taskId } });
  }

  static async getRecentComments(
    workspaceId: string,
    _userId: string,
    limit: number = 20
  ): Promise<Array<CommentWithUser & { taskTitle: string; projectName: string }>> {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);

    const comments = await prisma.comment.findMany({
      where: { task: { projectId: { in: projectIds } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        task: { select: { id: true, title: true, projectId: true } },
        user: true,
      },
    });

    return comments.map((comment) => {
      const project = projects.find((p) => p.id === comment.task.projectId);
      return {
        ...comment,
        taskTitle: comment.task.title,
        projectName: project?.name || 'Unknown Project',
        user: buildUserResponse(comment.user),
      };
    });
  }

  static async canEditComment(commentId: string, userId: string): Promise<boolean> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    return comment ? comment.userId === userId : false;
  }
}
