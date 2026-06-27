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

import { TaskService } from '../../src/services/task.service';
import { TaskStatus, TaskPriority } from '../../src/models';

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  avatarUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockProject = {
  id: 'proj-1',
  workspaceId: 'ws-1',
  name: 'Test Project',
  description: null,
  color: '#6366F1',
  ownerId: 'user-1',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockTask = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test Task',
  description: 'A description',
  status: TaskStatus.todo,
  priority: TaskPriority.medium,
  assignedTo: null,
  dueDate: null,
  position: 1,
  completedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockTaskFull = {
  ...mockTask,
  labels: [{ label: { id: 'l1', name: 'bug', color: 'red', projectId: 'proj-1' } }],
  _count: { comments: 2, attachments: 1 },
};

const mockTaskForList = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test Task',
  description: null,
  status: TaskStatus.todo,
  priority: TaskPriority.medium,
  assignedTo: null,
  dueDate: null,
  position: 1,
  completedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockWorkspaceMember = {
  id: 'wm-1',
  workspaceId: 'ws-1',
  userId: 'user-1',
  role: 'member',
  joinedAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Set up mocks for ProjectService.canAccessProject(projectId, userId).
 * Internally calls: project.findUnique → workspaceMember.findUnique (via hasWorkspacePermission).
 */
function mockCanAccessProject() {
  mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
  mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockWorkspaceMember);
}

/**
 * Set up mocks for AuthzService.requireProjectAccess(projectId, userId).
 * Internally calls: canAccessProject → project.findUnique → workspaceMember.findUnique.
 * Same mock chain as mockCanAccessProject.
 */
const mockRequireProjectAccess = mockCanAccessProject;

/**
 * Set up mocks for AuthzService.requireTaskAccess(taskId, userId).
 * Internally calls: task.findUnique({ select: { projectId } }) → requireProjectAccess.
 */
function mockRequireTaskAccess(existing: any = mockTask) {
  mockPrisma.task.findUnique.mockResolvedValueOnce(existing);
}

/** Simulate enrichTaskWithAssignee which calls user.findUnique when task.assignedTo is set */
function mockEnrichTask(assignee: any = null) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(assignee);
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('TaskService', () => {
  describe('createTask', () => {
    it('should create task and log activity', async () => {
      // 1. project existence check (line 51)
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      // 2. canAccessProject (line 59): project.findUnique + workspaceMember.findUnique
      mockCanAccessProject();
      // 3. task.findFirst for position (line 76)
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTaskForList);
      // 4. task.create (line 84)
      mockPrisma.task.create.mockResolvedValueOnce(mockTask);
      // 5. enrichTaskWithAssignee (line 106): user.findUnique (assignedTo is null)
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await TaskService.createTask('proj-1', 'user-1', {
        title: 'Test Task',
        description: 'A description',
      });

      expect(result.id).toBe('task-1');
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });

    it('should throw when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.createTask('no-such-proj', 'user-1', { title: 'Task' })
      ).rejects.toThrow('Project not found');
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.createTask('proj-1', 'user-99', { title: 'Task' })
      ).rejects.toThrow('Permission denied: not a member of this workspace');
    });

    it('should throw when assignee not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.createTask('proj-1', 'user-1', { title: 'Task', assignedTo: 'no-such' })
      ).rejects.toThrow('Assigned user not found');
    });
  });

  describe('getTaskById', () => {
    it('should return task with labels, assignee, and project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTaskFull);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const result = await TaskService.getTaskById('task-1');

      expect(result).not.toBeNull();
      expect(result!.labels).toHaveLength(1);
    });

    it('should return null when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      expect(await TaskService.getTaskById('no-such')).toBeNull();
    });

    it('should handle task without assignee', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        _count: { comments: 0, attachments: 0 },
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const result = await TaskService.getTaskById('task-1');
      expect(result!.assignee).toBeNull();
    });

    it('should throw when project is missing after task lookup', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        _count: { comments: 0, attachments: 0 },
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      await expect(TaskService.getTaskById('task-1')).rejects.toThrow('Project not found');
    });
  });

  describe('getProjectTasks', () => {
    it('should return paginated tasks with filters', async () => {
      mockCanAccessProject();
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTaskForList]);
      mockPrisma.task.count.mockResolvedValueOnce(1);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await TaskService.getProjectTasks('proj-1', 'user-1', {
        status: 'todo',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle assignedTo: unassigned filter', async () => {
      mockCanAccessProject();
      mockPrisma.task.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.count.mockResolvedValueOnce(0);

      await TaskService.getProjectTasks('proj-1', 'user-1', { assignedTo: 'unassigned' });
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'proj-1', assignedTo: null }),
        })
      );
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(TaskService.getProjectTasks('proj-1', 'user-99')).rejects.toThrow(
        'Permission denied: not a member of this workspace'
      );
    });
  });

  describe('updateTask', () => {
    it('should update all fields and log activities', async () => {
      // 1. task.findUnique (line 271)
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTaskFull);
      // 2. project.findUnique (line 288)
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      // 3. canAccessProject: project.findUnique + workspaceMember.findUnique
      mockCanAccessProject();
      // 4. assignee check skipped (assignedTo not in data)
      // 5. task.update (line 331)
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        title: 'Updated Title',
        status: TaskStatus.in_progress,
      });
      // 6. enrichTaskWithAssignee (after update)
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await TaskService.updateTask('task-1', 'user-1', {
        title: 'Updated Title',
        status: TaskStatus.in_progress,
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(
        TaskService.updateTask('no-such', 'user-1', { title: 'X' })
      ).rejects.toThrow('Task not found');
    });

    it('should throw when project not found after task', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        _count: { comments: 0, attachments: 0 },
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.updateTask('task-1', 'user-1', { title: 'X' })
      ).rejects.toThrow('Project not found');
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        _count: { comments: 0, attachments: 0 },
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.updateTask('task-1', 'user-99', { title: 'X' })
      ).rejects.toThrow('Permission denied: not a member of this workspace');
    });

    it('should throw when new assignee not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        _count: { comments: 0, attachments: 0 },
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockCanAccessProject();
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.updateTask('task-1', 'user-1', { assignedTo: 'no-such' })
      ).rejects.toThrow('Assigned user not found');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update status and log activity', async () => {
      // 1. task.findUnique with project include (line 432)
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        status: TaskStatus.todo,
        project: mockProject,
      });
      // 2. requireProjectAccess: project.findUnique + workspaceMember.findUnique
      mockRequireProjectAccess();
      // 3. task.update (line 445)
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        status: TaskStatus.done,
      });
      // 4. enrichTaskWithAssignee
      mockEnrichTask();

      const result = await TaskService.updateTaskStatus('task-1', 'user-1', TaskStatus.done);
      expect(result.status).toBe(TaskStatus.done);
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(
        TaskService.updateTaskStatus('no-such', 'user-1', TaskStatus.done)
      ).rejects.toThrow('Task not found');
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        project: mockProject,
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.updateTaskStatus('task-1', 'user-99', TaskStatus.done)
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should skip activity log when status unchanged', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        status: TaskStatus.todo,
        project: mockProject,
      });
      mockRequireProjectAccess();
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        status: TaskStatus.todo,
      });
      mockEnrichTask();

      const { ActivityService } = require('../../src/services/activity.service');
      await TaskService.updateTaskStatus('task-1', 'user-1', TaskStatus.todo);
      expect(ActivityService.log).not.toHaveBeenCalled();
    });
  });

  describe('assignTask', () => {
    it('should assign user to task and log activity', async () => {
      // 1. task.findUnique with project include (line 471)
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        assignedTo: null,
        project: mockProject,
      });
      // 2. requireProjectAccess → project.findUnique + workspaceMember.findUnique
      mockRequireProjectAccess();
      // 3. user.findUnique for assignee check (line 483) — found
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      // 4. task.update (line 494)
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        assignedTo: 'user-1',
      });
      // 5. user.findUnique × 2 for old + new assignee names (lines 502, 507)
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser); // new name
      // old is null so no second call
      // 6. enrichTaskWithAssignee (assignedTo is 'user-1')
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await TaskService.assignTask('task-1', 'user-1', 'user-1');
      expect(result.assignedTo).toBe('user-1');
    });

    it('should unassign user when assigneeId is null', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        assignedTo: 'user-2',
        project: mockProject,
      });
      mockRequireProjectAccess();
      // No assignee check (assigneeId is null)
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        assignedTo: null,
      });
      // user.findUnique for old assignee name
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      // enrichTaskWithAssignee (assignedTo is null)
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await TaskService.assignTask('task-1', 'user-1', null);
      expect(result.assignedTo).toBeNull();
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(
        TaskService.assignTask('no-such', 'user-1', 'user-2')
      ).rejects.toThrow('Task not found');
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        project: mockProject,
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.assignTask('task-1', 'user-99', 'user-2')
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should throw when assignee user not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        project: mockProject,
      });
      mockRequireProjectAccess();
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        TaskService.assignTask('task-1', 'user-1', 'no-such')
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete task and log activity', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        project: mockProject,
      });
      mockCanAccessProject();
      mockPrisma.task.delete.mockResolvedValueOnce(mockTask);

      await TaskService.deleteTask('task-1', 'user-1');
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(TaskService.deleteTask('no-such', 'user-1')).rejects.toThrow('Task not found');
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        ...mockTask,
        labels: [],
        project: mockProject,
      });
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(TaskService.deleteTask('task-1', 'user-99')).rejects.toThrow(
        'Permission denied: not a member of this workspace'
      );
    });
  });

  describe('reorderTask', () => {
    it('should update task position', async () => {
      mockRequireTaskAccess();
      mockRequireProjectAccess();
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, position: 5 });
      mockEnrichTask();

      const result = await TaskService.reorderTask('task-1', 'user-1', 5);
      expect(result.position).toBe(5);
    });

    it('should throw when user cannot access task project', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(
        TaskService.reorderTask('no-such', 'user-1', 5)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('bulkUpdateTasks', () => {
    it('should update multiple tasks with same project access', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { id: 'task-1', projectId: 'proj-1' },
        { id: 'task-2', projectId: 'proj-1' },
      ]);
      mockRequireProjectAccess(); // for proj-1
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, id: 'task-1' });
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, id: 'task-2' });
      mockEnrichTask(); // task-1 enrich
      mockEnrichTask(); // task-2 enrich

      const result = await TaskService.bulkUpdateTasks(
        { taskIds: ['task-1', 'task-2'], status: TaskStatus.done },
        'user-1'
      );
      expect(result).toHaveLength(2);
    });

    it('should handle tasks across multiple projects', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { id: 'task-1', projectId: 'proj-1' },
        { id: 'task-2', projectId: 'proj-2' },
      ]);
      mockRequireProjectAccess(); // proj-1
      mockRequireProjectAccess(); // proj-2
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, id: 'task-1' });
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, id: 'task-2' });
      mockEnrichTask();
      mockEnrichTask();

      const result = await TaskService.bulkUpdateTasks(
        { taskIds: ['task-1', 'task-2'], status: TaskStatus.done },
        'user-1'
      );
      expect(result).toHaveLength(2);
    });

    it('should handle undefined assignedTo', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { id: 'task-1', projectId: 'proj-1' },
      ]);
      mockRequireProjectAccess();
      mockPrisma.task.update.mockResolvedValueOnce(mockTask);
      mockEnrichTask();

      const result = await TaskService.bulkUpdateTasks(
        { taskIds: ['task-1'], priority: TaskPriority.high },
        'user-1'
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('bulkDeleteTasks', () => {
    it('should delete multiple tasks and log activity', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { id: 'task-1', projectId: 'proj-1', title: 'Task 1', project: { workspaceId: 'ws-1' } },
        { id: 'task-2', projectId: 'proj-1', title: 'Task 2', project: { workspaceId: 'ws-1' } },
      ]);
      mockRequireProjectAccess();
      mockPrisma.task.deleteMany.mockResolvedValueOnce({ count: 2 });

      const result = await TaskService.bulkDeleteTasks(['task-1', 'task-2'], 'user-1');
      expect(result).toBe(2);
    });

    it('should throw when user cannot access project', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { id: 'task-1', projectId: 'proj-1', title: 'Task 1', project: { workspaceId: 'ws-1' } },
      ]);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(TaskService.bulkDeleteTasks(['task-1'], 'user-99')).rejects.toThrow(
        'You do not have access to this project'
      );
    });
  });

  describe('getUserTasks', () => {
    it('should return paginated tasks assigned to user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { ...mockTaskForList, assignedTo: 'user-1' },
      ]);
      mockPrisma.task.count.mockResolvedValueOnce(1);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      // No enrichTaskWithAssignee — getUserTasks builds its own result inline

      const result = await TaskService.getUserTasks('user-1');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(TaskService.getUserTasks('no-such')).rejects.toThrow('User not found');
    });

    it('should filter by status', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.task.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.count.mockResolvedValueOnce(0);

      await TaskService.getUserTasks('user-1', TaskStatus.done);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedTo: 'user-1', status: TaskStatus.done }),
        })
      );
    });

    it('should return empty result when no tasks', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.task.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.count.mockResolvedValueOnce(0);

      const result = await TaskService.getUserTasks('user-1');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks for user workspaces', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockWorkspaceMember]);
      mockPrisma.project.findMany.mockResolvedValueOnce([{ id: 'proj-1' }]);
      mockPrisma.task.findMany.mockResolvedValueOnce([
        {
          ...mockTaskForList,
          dueDate: new Date('2023-01-01'),
          status: TaskStatus.todo,
        },
      ]);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // assignee none

      const result = await TaskService.getOverdueTasks('user-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no overdue tasks', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockWorkspaceMember]);
      mockPrisma.project.findMany.mockResolvedValueOnce([{ id: 'proj-1' }]);
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      const result = await TaskService.getOverdueTasks('user-1');
      expect(result).toHaveLength(0);
    });

    it('should handle case with no workspace memberships', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.project.findMany.mockResolvedValueOnce([]);
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      const result = await TaskService.getOverdueTasks('user-1');
      expect(result).toHaveLength(0);
    });
  });
});
