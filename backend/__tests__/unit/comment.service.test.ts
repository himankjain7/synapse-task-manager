import { createMockPrisma } from '../helpers/prisma-mock';

const mockPrisma = createMockPrisma();

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../../src/services/activity.service', () => ({
  ActivityService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

import { CommentService } from '../../src/services/comment.service';

const mockUser = { id: 'user-1', email: 'u@e.com', name: 'User', avatarUrl: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };
const mockOtherUser = { id: 'user-2', email: 'o@e.com', name: 'Other', avatarUrl: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'P', description: null, color: '#000', ownerId: 'user-1', status: 'active', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockTask = { id: 'task-1', projectId: 'proj-1', title: 'T', description: null, status: 'todo', priority: 'medium', assignedTo: null, dueDate: null, position: 1, completedAt: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null };
const mockComment = { id: 'c1', taskId: 'task-1', userId: 'user-1', parentId: null, content: 'Hello!', createdAt: new Date('2024-01-01'), updatedAt: null, deletedAt: null };
const mockWm = { id: 'wm-1', workspaceId: 'ws-1', userId: 'user-1', role: 'admin', createdAt: new Date('2024-01-01'), deletedAt: null };

function mockCanAccessProject() {
  mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
  mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockWm);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('CommentService', () => {
  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.comment.create.mockResolvedValueOnce(mockComment);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const result = await CommentService.createComment('task-1', 'user-1', { taskId: 'task-1', content: 'Hello!' });

      expect(result.content).toBe('Hello!');
      expect(result.user.id).toBe('user-1');
      expect(mockPrisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'Hello!' }) })
      );
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.createComment('task-x', 'user-1', { taskId: 'task-x', content: 'X' })).rejects.toThrow('Task not found');
    });

    it('should throw when permission denied', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.createComment('task-1', 'user-x', { taskId: 'task-1', content: 'X' })).rejects.toThrow('Permission denied');
    });

    it('should throw when user not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.createComment('task-1', 'user-1', { taskId: 'task-1', content: 'X' })).rejects.toThrow('User not found');
    });

    it('should create notifications for mentioned users', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const commentWithMention = { ...mockComment, content: 'Hey @[Other](user-2) look' };
      mockPrisma.comment.create.mockResolvedValueOnce(commentWithMention);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      await CommentService.createComment('task-1', 'user-1', { taskId: 'task-1', content: 'Hey @[Other](user-2) look' });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-2', type: 'comment_mention' }) })
      );
    });
  });

  describe('createReply', () => {
    it('should create a reply to a parent comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const reply = { ...mockComment, id: 'c2', parentId: 'c1', content: 'Reply!' };
      mockPrisma.comment.create.mockResolvedValueOnce(reply);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const result = await CommentService.createReply('task-1', 'user-1', 'c1', { content: 'Reply!' });

      expect(result.content).toBe('Reply!');
      expect(mockPrisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ parentId: 'c1' }) })
      );
    });

    it('should throw when parent comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.createReply('task-1', 'user-1', 'c-x', { content: 'X' })).rejects.toThrow('Parent comment not found');
    });
  });

  describe('getCommentById', () => {
    it('should return comment with reactions', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.commentReaction.findMany.mockResolvedValueOnce([{ id: 'r1', commentId: 'c1', userId: 'user-2', emoji: '👍', createdAt: new Date(), user: { id: 'user-2', name: 'Other' } }]);

      const result = await CommentService.getCommentById('c1');

      expect(result?.content).toBe('Hello!');
      expect(result?.reactions).toHaveLength(1);
    });

    it('should return null when comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      const result = await CommentService.getCommentById('c-x');
      expect(result).toBeNull();
    });

    it('should throw when comment author not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.getCommentById('c1')).rejects.toThrow('Comment author not found');
    });
  });

  describe('getTaskComments', () => {
    it('should return paginated comments with replies and reactions', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.comment.findMany.mockResolvedValueOnce([mockComment]);
      mockPrisma.comment.count.mockResolvedValueOnce(1);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.comment.findMany.mockResolvedValueOnce([]);
      mockPrisma.commentReaction.findMany.mockResolvedValueOnce([]);

      const result = await CommentService.getTaskComments('task-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.getTaskComments('task-x', 'user-1')).rejects.toThrow('Task not found');
    });
  });

  describe('updateComment', () => {
    it('should update own comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const updated = { ...mockComment, content: 'Updated!', updatedAt: new Date() };
      mockPrisma.comment.update.mockResolvedValueOnce(updated);
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...mockTask, project: mockProject });

      const result = await CommentService.updateComment('c1', 'user-1', { content: 'Updated!' });

      expect(result.content).toBe('Updated!');
    });

    it('should throw when comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.updateComment('c-x', 'user-1', { content: 'X' })).rejects.toThrow('Comment not found');
    });

    it('should throw when not the author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      await expect(CommentService.updateComment('c1', 'user-2', { content: 'X' })).rejects.toThrow('only comment author');
    });
  });

  describe('deleteComment', () => {
    it('should delete own comment and child replies', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...mockTask, project: mockProject });

      await CommentService.deleteComment('c1', 'user-1');

      expect(mockPrisma.comment.deleteMany).toHaveBeenCalledWith({ where: { parentId: 'c1' } });
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('should throw when comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.deleteComment('c-x', 'user-1')).rejects.toThrow('Comment not found');
    });

    it('should throw when not the author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      await expect(CommentService.deleteComment('c1', 'user-2')).rejects.toThrow('only comment author');
    });
  });

  describe('addReaction', () => {
    it('should add a reaction', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.commentReaction.findUnique.mockResolvedValueOnce(null);
      const reaction = { id: 'r1', commentId: 'c1', userId: 'user-1', emoji: '👍', createdAt: new Date(), user: { id: 'user-1', name: 'User' } };
      mockPrisma.commentReaction.create.mockResolvedValueOnce(reaction);

      const result = await CommentService.addReaction('c1', 'user-1', '👍');

      expect(result.emoji).toBe('👍');
    });

    it('should throw when comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.addReaction('c-x', 'user-1', '👍')).rejects.toThrow('Comment not found');
    });

    it('should throw when reaction already exists', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      mockPrisma.commentReaction.findUnique.mockResolvedValueOnce({ id: 'r1' });
      await expect(CommentService.addReaction('c1', 'user-1', '👍')).rejects.toThrow('Reaction already exists');
    });
  });

  describe('removeReaction', () => {
    it('should remove an existing reaction', async () => {
      mockPrisma.commentReaction.findUnique.mockResolvedValueOnce({ id: 'r1', commentId: 'c1', userId: 'user-1', emoji: '👍' });

      await CommentService.removeReaction('c1', 'user-1', '👍');

      expect(mockPrisma.commentReaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('should throw when reaction not found', async () => {
      mockPrisma.commentReaction.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.removeReaction('c1', 'user-1', '👍')).rejects.toThrow('Reaction not found');
    });
  });

  describe('getUserComments', () => {
    it('should return paginated user comments', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.comment.findMany.mockResolvedValueOnce([mockComment]);
      mockPrisma.comment.count.mockResolvedValueOnce(1);

      const result = await CommentService.getUserComments('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(CommentService.getUserComments('user-x')).rejects.toThrow('User not found');
    });
  });

  describe('getCommentCount', () => {
    it('should return comment count', async () => {
      mockPrisma.comment.count.mockResolvedValueOnce(5);
      const result = await CommentService.getCommentCount('task-1');
      expect(result).toBe(5);
    });
  });

  describe('getRecentComments', () => {
    it('should return recent comments with task and project info', async () => {
      mockPrisma.project.findMany.mockResolvedValueOnce([{ id: 'proj-1', name: 'P' }]);
      mockPrisma.comment.findMany.mockResolvedValueOnce([
        { ...mockComment, task: { id: 'task-1', title: 'Test Task', projectId: 'proj-1' }, user: mockUser },
      ]);

      const result = await CommentService.getRecentComments('ws-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].taskTitle).toBe('Test Task');
      expect(result[0].projectName).toBe('P');
    });
  });

  describe('canEditComment', () => {
    it('should return true when user is author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      const result = await CommentService.canEditComment('c1', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when user is not author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(mockComment);
      const result = await CommentService.canEditComment('c1', 'user-2');
      expect(result).toBe(false);
    });

    it('should return false when comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      const result = await CommentService.canEditComment('c-x', 'user-1');
      expect(result).toBe(false);
    });
  });
});
