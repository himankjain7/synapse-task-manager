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

import { LabelService } from '../../src/services/label.service';

const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'P', description: null, color: '#000', ownerId: 'user-1', status: 'active', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockTask = { id: 'task-1', projectId: 'proj-1', title: 'T', description: null, status: 'todo', priority: 'medium', assignedTo: null, dueDate: null, position: 1, completedAt: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null };
const mockLabel = { id: 'l1', projectId: 'proj-1', name: 'bug', color: 'red', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };
const mockWm = { id: 'wm-1', workspaceId: 'ws-1', userId: 'user-1', role: 'admin', createdAt: new Date('2024-01-01'), deletedAt: null };

function mockCanAccessProject() {
  mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
  mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockWm);
}

function mockDenyAccess() {
  mockPrisma.project.findUnique.mockResolvedValueOnce(null);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('LabelService', () => {
  describe('getProjectLabels', () => {
    it('should return labels for a project', async () => {
      mockCanAccessProject();
      mockPrisma.taskLabel.findMany.mockResolvedValueOnce([mockLabel]);

      const result = await LabelService.getProjectLabels('proj-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('bug');
    });

    it('should throw when access denied', async () => {
      mockDenyAccess();
      await expect(LabelService.getProjectLabels('proj-x', 'user-1')).rejects.toThrow('do not have access');
    });
  });

  describe('createLabel', () => {
    it('should create a label', async () => {
      mockCanAccessProject();
      mockPrisma.taskLabel.create.mockResolvedValueOnce(mockLabel);

      const result = await LabelService.createLabel('proj-1', 'bug', 'red', 'user-1');

      expect(result.name).toBe('bug');
      expect(result.color).toBe('red');
    });

    it('should throw when access denied', async () => {
      mockDenyAccess();
      await expect(LabelService.createLabel('proj-x', 'bug', 'red', 'user-1')).rejects.toThrow('do not have access');
    });
  });

  describe('updateLabel', () => {
    it('should update a label', async () => {
      mockPrisma.taskLabel.findUnique.mockResolvedValueOnce({ projectId: 'proj-1' });
      mockCanAccessProject();
      const updated = { ...mockLabel, name: 'feature', color: 'blue' };
      mockPrisma.taskLabel.update.mockResolvedValueOnce(updated);

      const result = await LabelService.updateLabel('l1', 'feature', 'blue', 'user-1');

      expect(result.name).toBe('feature');
    });

    it('should throw when label not found', async () => {
      mockPrisma.taskLabel.findUnique.mockResolvedValueOnce(null);
      await expect(LabelService.updateLabel('l-x', 'f', 'b', 'user-1')).rejects.toThrow('Label not found');
    });
  });

  describe('deleteLabel', () => {
    it('should delete a label and its assignments', async () => {
      mockPrisma.taskLabel.findUnique.mockResolvedValueOnce({ projectId: 'proj-1' });
      mockCanAccessProject();

      await LabelService.deleteLabel('l1', 'user-1');

      expect(mockPrisma.taskLabelAssignment.deleteMany).toHaveBeenCalledWith({ where: { labelId: 'l1' } });
      expect(mockPrisma.taskLabel.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    });
  });

  describe('assignLabelToTask', () => {
    it('should assign a label to a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({ projectId: 'proj-1' });
      mockCanAccessProject();
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...mockTask, project: mockProject });
      mockPrisma.taskLabel.findUnique.mockResolvedValueOnce(mockLabel);
      mockPrisma.taskLabelAssignment.create.mockResolvedValueOnce({ id: 'assgn-1', taskId: 'task-1', labelId: 'l1' });

      const result = await LabelService.assignLabelToTask('task-1', 'l1', 'user-1');

      expect(result.taskId).toBe('task-1');
    });

    it('should throw when task not found for authz', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(LabelService.assignLabelToTask('task-x', 'l1', 'user-1')).rejects.toThrow('Task not found');
    });
  });

  describe('removeLabelFromTask', () => {
    it('should remove a label from a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({ projectId: 'proj-1' });
      mockCanAccessProject();
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...mockTask, project: mockProject });
      mockPrisma.taskLabel.findUnique.mockResolvedValueOnce(mockLabel);

      await LabelService.removeLabelFromTask('task-1', 'l1', 'user-1');

      expect(mockPrisma.taskLabelAssignment.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-1', labelId: 'l1' },
      });
    });
  });

  describe('getTaskLabels', () => {
    it('should return labels for a task', async () => {
      mockPrisma.taskLabelAssignment.findMany.mockResolvedValueOnce([
        { id: 'a1', taskId: 'task-1', labelId: 'l1', label: mockLabel },
      ]);

      const result = await LabelService.getTaskLabels('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('bug');
    });
  });
});
