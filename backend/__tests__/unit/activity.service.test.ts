import { createMockPrisma } from '../helpers/prisma-mock';

const mockPrisma = createMockPrisma();

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { ActivityService } from '../../src/services/activity.service';

const mockUser = { id: 'user-1', email: 'u@e.com', name: 'User', avatarUrl: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };
const mockActivity = { id: 'a1', workspaceId: 'ws-1', taskId: 'task-1', userId: 'user-1', action: 'task_created', details: {}, createdAt: new Date('2024-01-01'), user: mockUser };

beforeEach(() => { jest.clearAllMocks(); });

describe('ActivityService', () => {
  describe('log', () => {
    it('should create an activity log entry', async () => {
      mockPrisma.activityLog.create.mockResolvedValueOnce(mockActivity);

      await ActivityService.log({ workspaceId: 'ws-1', taskId: 'task-1', userId: 'user-1', action: 'task_created', details: { title: 'New Task' } });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workspaceId: 'ws-1', action: 'task_created' }),
        })
      );
    });

    it('should log without taskId', async () => {
      mockPrisma.activityLog.create.mockResolvedValueOnce({ ...mockActivity, taskId: null });

      await ActivityService.log({ workspaceId: 'ws-1', userId: 'user-1', action: 'workspace_updated', details: {} });

      expect(mockPrisma.activityLog.create).toHaveBeenCalled();
    });
  });

  describe('getTaskActivity', () => {
    it('should return activity for a task', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValueOnce([mockActivity]);

      const result = await ActivityService.getTaskActivity('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('task_created');
      expect(result[0].user.id).toBe('user-1');
    });

    it('should return empty array when no activity', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValueOnce([]);

      const result = await ActivityService.getTaskActivity('task-x');

      expect(result).toHaveLength(0);
    });
  });
});
