import { createMockPrisma } from '../helpers/prisma-mock';

const mockPrisma = createMockPrisma();

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { AnalyticsService } from '../../src/services/analytics.service';

const mockMember = {
  id: 'wm-1',
  workspaceId: 'ws-1',
  userId: 'user-1',
  role: 'member',
  joinedAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProject = { id: 'proj-1', name: 'Test Project' };

function mockProjectAccess() {
  mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
  mockPrisma.workspaceMember.findUnique.mockResolvedValue(mockMember);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AnalyticsService', () => {
  describe('getDashboardAnalytics', () => {
    it('should return dashboard analytics with computed values', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.project.findMany.mockResolvedValue([mockProject]);
      mockPrisma.task.count.mockResolvedValue(10);
      mockPrisma.task.groupBy.mockResolvedValue([
        { status: 'todo', _count: 4 },
        { status: 'done', _count: 3 },
        { status: 'backlog', _count: 2 },
        { status: 'in_progress', _count: 1 },
      ]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await AnalyticsService.getDashboardAnalytics('user-1');

      expect(result.totalTasks).toBe(10);
      expect(result.completedTasks).toBe(3);
      expect(result.activeTasks).toBe(5);
      expect(result.completionRate).toBe(30);
      expect(result.weeklyTrend).toHaveLength(8);
      expect(result.monthlyTrend).toHaveLength(6);
      expect(result.upcomingDeadlines).toEqual([]);
    });

    it('should handle zero total tasks', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.project.findMany.mockResolvedValue([mockProject]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await AnalyticsService.getDashboardAnalytics('user-1');

      expect(result.totalTasks).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.productivityScore).toBe(0);
    });

    it('should handle no workspaces', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await AnalyticsService.getDashboardAnalytics('user-1');

      expect(result.totalTasks).toBe(0);
      expect(result.activeTasks).toBe(0);
    });

    it('should handle no projects in workspace', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await AnalyticsService.getDashboardAnalytics('user-1');

      expect(result.totalTasks).toBe(0);
    });
  });

  describe('getWorkspaceAnalytics', () => {
    it('should return workspace analytics with insights', async () => {
      mockProjectAccess();
      mockPrisma.project.findMany.mockResolvedValueOnce([mockProject]);
      mockPrisma.task.count.mockResolvedValue(20);
      mockPrisma.task.groupBy
        .mockResolvedValueOnce([
          { status: 'done', _count: 8 },
          { status: 'todo', _count: 7 },
          { status: 'backlog', _count: 3 },
          { status: 'in_progress', _count: 2 },
        ])
        .mockResolvedValueOnce([
          { priority: 'high', _count: 5 },
          { priority: 'low', _count: 3 },
        ]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.findMany.mockResolvedValueOnce([]);

      const result = await AnalyticsService.getWorkspaceAnalytics('ws-1', 'user-1');

      expect(result.totalProjects).toBe(1);
      expect(result.totalTasks).toBe(20);
      expect(result.completedTasks).toBe(8);
      expect(result.activeTasks).toBe(9);
      expect(result.completionPercent).toBe(40);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle no projects in workspace', async () => {
      mockProjectAccess();
      mockPrisma.project.findMany.mockResolvedValueOnce([]);
      mockPrisma.activityLog.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await AnalyticsService.getWorkspaceAnalytics('ws-1', 'user-1');

      expect(result.totalProjects).toBe(0);
      expect(result.totalTasks).toBe(0);
    });

    it('should throw when user has no access', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(AnalyticsService.getWorkspaceAnalytics('ws-1', 'user-99'))
        .rejects.toThrow('You do not have access to this workspace');
    });
  });

  describe('getProjectAnalytics', () => {
    it('should return project analytics with velocity', async () => {
      mockProjectAccess();
      mockPrisma.task.count.mockResolvedValue(10);
      mockPrisma.task.groupBy
        .mockResolvedValueOnce([
          { status: 'done', _count: 4 },
          { status: 'todo', _count: 3 },
        ])
        .mockResolvedValueOnce([
          { priority: 'high', _count: 2 },
          { priority: 'low', _count: 2 },
        ]);
      mockPrisma.task.aggregate.mockResolvedValueOnce({
        _min: { createdAt: new Date('2024-01-01') },
      });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await AnalyticsService.getProjectAnalytics('proj-1', 'user-1');

      expect(result.totalTasks).toBe(10);
      expect(result.completedTasks).toBe(10);
      expect(result.completionPercent).toBeGreaterThan(0);
      expect(result.velocity).toBeDefined();
      expect(result.completionTrend).toHaveLength(4);
    });

    it('should handle empty project', async () => {
      mockProjectAccess();
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.aggregate.mockResolvedValueOnce({
        _min: { createdAt: null },
      });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await AnalyticsService.getProjectAnalytics('proj-1', 'user-1');

      expect(result.totalTasks).toBe(0);
      expect(result.completionPercent).toBe(0);
      expect(result.velocity).toBe(0);
    });

    it('should handle single task (no days elapsed edge case)', async () => {
      mockProjectAccess();
      mockPrisma.task.count.mockResolvedValue(1);
      mockPrisma.task.groupBy
        .mockResolvedValueOnce([{ status: 'todo', _count: 1 }])
        .mockResolvedValueOnce([]);
      mockPrisma.task.aggregate.mockResolvedValueOnce({
        _min: { createdAt: new Date() },
      });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await AnalyticsService.getProjectAnalytics('proj-1', 'user-1');

      expect(result.totalTasks).toBe(1);
      expect(result.velocity).toBeGreaterThanOrEqual(0);
    });

    it('should throw when user has no access', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(AnalyticsService.getProjectAnalytics('proj-1', 'user-99'))
        .rejects.toThrow('You do not have access to this project');
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics with counts', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2);

      const result = await AnalyticsService.getUserAnalytics('user-1');

      expect(result.assignedTasks).toBe(15);
      expect(result.completedThisWeek).toBe(3);
      expect(result.completedThisMonth).toBe(8);
      expect(result.overdueAssigned).toBe(2);
    });

    it('should handle user with no tasks', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await AnalyticsService.getUserAnalytics('user-1');

      expect(result.assignedTasks).toBe(0);
      expect(result.completedThisWeek).toBe(0);
      expect(result.completedThisMonth).toBe(0);
      expect(result.overdueAssigned).toBe(0);
    });
  });
});
