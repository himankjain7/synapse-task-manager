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

import { SubtaskService } from '../../src/services/subtask.service';

const mockTask = { id: 'task-1', projectId: 'proj-1', title: 'T', description: null, status: 'todo', priority: 'medium', assignedTo: null, dueDate: null, position: 1, completedAt: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null };
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'P', description: null, color: '#000', ownerId: 'user-1', status: 'active', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockWm = { id: 'wm-1', workspaceId: 'ws-1', userId: 'user-1', role: 'admin', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockSubtask = { id: 'st-1', taskId: 'task-1', title: 'Subt', completed: false, position: 0, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };

function mockRequireTaskAccess() {
  mockPrisma.task.findUnique.mockResolvedValueOnce({ projectId: 'proj-1' });
  mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
  mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockWm);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('SubtaskService', () => {
  describe('list', () => {
    it('should list subtasks for a task', async () => {
      mockRequireTaskAccess();
      mockPrisma.subtask.findMany.mockResolvedValueOnce([mockSubtask]);

      const result = await SubtaskService.list('task-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('st-1');
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(SubtaskService.list('task-x', 'user-1')).rejects.toThrow('Task not found');
    });
  });

  describe('create', () => {
    it('should create a subtask', async () => {
      mockRequireTaskAccess();
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...mockTask, project: mockProject });
      mockPrisma.subtask.aggregate.mockResolvedValueOnce({ _max: { position: 2 } });
      const created = { ...mockSubtask, title: 'New Subtask', position: 3 };
      mockPrisma.subtask.create.mockResolvedValueOnce(created);

      const result = await SubtaskService.create('task-1', 'user-1', { title: 'New Subtask' });

      expect(result.position).toBe(3);
      expect(result.title).toBe('New Subtask');
    });

    it('should throw when task not found for authz', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(SubtaskService.create('task-x', 'user-1', { title: 'X' })).rejects.toThrow('Task not found');
    });
  });

  describe('update', () => {
    it('should update a subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValueOnce({ ...mockSubtask, task: { ...mockTask, project: mockProject } });
      mockRequireTaskAccess();
      const updated = { ...mockSubtask, title: 'Updated', completed: true };
      mockPrisma.subtask.update.mockResolvedValueOnce(updated);

      const result = await SubtaskService.update('st-1', 'user-1', { title: 'Updated', completed: true });

      expect(result.title).toBe('Updated');
      expect(result.completed).toBe(true);
    });

    it('should throw when subtask not found', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValueOnce(null);
      await expect(SubtaskService.update('st-x', 'user-1', { title: 'X' })).rejects.toThrow('Subtask not found');
    });
  });

  describe('delete', () => {
    it('should delete a subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValueOnce({ ...mockSubtask, task: { ...mockTask, project: mockProject } });
      mockRequireTaskAccess();

      await SubtaskService.delete('st-1', 'user-1');

      expect(mockPrisma.subtask.delete).toHaveBeenCalledWith({ where: { id: 'st-1' } });
    });

    it('should throw when subtask not found', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValueOnce(null);
      await expect(SubtaskService.delete('st-x', 'user-1')).rejects.toThrow('Subtask not found');
    });
  });
});
