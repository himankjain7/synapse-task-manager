import { createMockPrisma } from '../helpers/prisma-mock';

const mockPrisma = createMockPrisma();

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { SearchService } from '../../src/services/search.service';

const mockWorkspace = { id: 'ws-1', name: 'My Workspace', description: null, createdAt: new Date('2024-01-01'), deletedAt: null, ownerId: 'user-1' };
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'My Project', description: null, color: '#000', ownerId: 'user-1', status: 'active', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockTask = { id: 'task-1', projectId: 'proj-1', title: 'My Task', description: 'desc', status: 'todo', priority: 'medium', assignedTo: null, dueDate: null, position: 1, completedAt: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null, project: { id: 'proj-1' } };
const mockLabel = { id: 'l1', projectId: 'proj-1', name: 'bug', color: 'red', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };

beforeEach(() => { jest.clearAllMocks(); });

describe('SearchService', () => {
  describe('global', () => {
    it('should search across all entities', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([{ workspaceId: 'ws-1' }]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([{ id: 'ws-1' }]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([mockWorkspace]);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockProject]);
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);
      mockPrisma.taskLabel.findMany.mockResolvedValueOnce([mockLabel]);

      const result = await SearchService.global('My', 'user-1');

      expect(result.workspaces).toHaveLength(1);
      expect(result.projects).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(result.labels).toHaveLength(1);
    });

    it('should return empty results when no matches', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([]);
      mockPrisma.project.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.findMany.mockResolvedValueOnce([]);
      mockPrisma.taskLabel.findMany.mockResolvedValueOnce([]);

      const result = await SearchService.global('zzz', 'user-x');

      expect(result.workspaces).toHaveLength(0);
      expect(result.projects).toHaveLength(0);
      expect(result.tasks).toHaveLength(0);
      expect(result.labels).toHaveLength(0);
    });
  });
});
