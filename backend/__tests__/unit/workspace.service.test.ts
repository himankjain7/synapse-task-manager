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

import { WorkspaceService } from '../../src/services/workspace.service';
import { WorkspaceMemberRole } from '../../src/models';

const mockUser = {
  id: 'user-1',
  email: 'owner@example.com',
  name: 'Owner User',
  avatarUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockWorkspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  description: 'A test workspace',
  ownerId: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockMember = {
  id: 'member-1',
  workspaceId: 'ws-1',
  userId: 'user-2',
  role: WorkspaceMemberRole.MEMBER,
  joinedAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdminMember = {
  ...mockMember,
  userId: 'user-1',
  role: WorkspaceMemberRole.OWNER,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WorkspaceService', () => {
  describe('createWorkspace', () => {
    it('should create workspace and add creator as owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.workspace.create.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.workspaceMember.create.mockResolvedValueOnce(mockAdminMember);

      const result = await WorkspaceService.createWorkspace('user-1', {
        name: 'Test Workspace',
        description: 'A test workspace',
      });

      expect(result.name).toBe('Test Workspace');
      expect(result.owner.id).toBe('user-1');
      expect(mockPrisma.workspace.create).toHaveBeenCalled();
      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-1',
            userId: 'user-1',
            role: WorkspaceMemberRole.OWNER,
          }),
        })
      );
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.createWorkspace('no-such-user', { name: 'WS' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('getWorkspaceById', () => {
    it('should return workspace with owner', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await WorkspaceService.getWorkspaceById('ws-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ws-1');
      expect(result!.owner.id).toBe('user-1');
    });

    it('should return null when workspace not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(null);

      const result = await WorkspaceService.getWorkspaceById('no-such-ws');
      expect(result).toBeNull();
    });

    it('should throw when owner not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.getWorkspaceById('ws-1')).rejects.toThrow('Workspace owner not found');
    });
  });

  describe('getUserWorkspaces', () => {
    it('should return paginated workspaces for user', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockAdminMember]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([mockWorkspace]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(1);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await WorkspaceService.getUserWorkspaces('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].owner.id).toBe('user-1');
    });

    it('should return empty list when no memberships', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspace.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(0);

      const result = await WorkspaceService.getUserWorkspaces('user-1');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply pagination', async () => {
      const manyMembers = Array.from({ length: 15 }, (_, i) => ({
        ...mockAdminMember,
        userId: `user-${i}`,
        workspaceId: `ws-${i}`,
      }));
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce(manyMembers.slice(10));
      mockPrisma.workspace.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(15);

      await WorkspaceService.getUserWorkspaces('user-1', 2, 10);

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace when user is owner', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.workspace.update.mockResolvedValueOnce({ ...mockWorkspace, name: 'Updated' });

      const result = await WorkspaceService.updateWorkspace('ws-1', 'user-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw when workspace not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.updateWorkspace('no-such-ws', 'user-1', { name: 'X' }))
        .rejects.toThrow('Workspace not found');
    });

    it('should throw when user is not owner', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);

      await expect(WorkspaceService.updateWorkspace('ws-1', 'user-2', { name: 'X' }))
        .rejects.toThrow('Only workspace owner can update workspace');
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace when user is owner', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.workspace.delete.mockResolvedValueOnce(mockWorkspace);

      await WorkspaceService.deleteWorkspace('ws-1', 'user-1');
      expect(mockPrisma.workspace.delete).toHaveBeenCalledWith({ where: { id: 'ws-1' } });
    });

    it('should throw when workspace not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.deleteWorkspace('no-such-ws', 'user-1'))
        .rejects.toThrow('Workspace not found');
    });

    it('should throw when user is not owner', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);

      await expect(WorkspaceService.deleteWorkspace('ws-1', 'user-2'))
        .rejects.toThrow('Only workspace owner can delete workspace');
    });
  });

  describe('addWorkspaceMember', () => {
    it('should add member when user is owner', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember) // getUserRoleInWorkspace
        .mockResolvedValueOnce(null);           // check existing member
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser); // target user
      mockPrisma.workspaceMember.create.mockResolvedValueOnce(mockMember);

      const result = await WorkspaceService.addWorkspaceMember('ws-1', 'user-1', {
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      });

      expect(result.userId).toBe('user-2');
    });

    it('should throw when user is not owner or admin', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce({
        ...mockMember,
        role: WorkspaceMemberRole.GUEST,
      });

      await expect(WorkspaceService.addWorkspaceMember('ws-1', 'user-2', {
        userId: 'user-3',
        role: WorkspaceMemberRole.MEMBER,
      })).rejects.toThrow('Permission denied: only owner or admin can add members');
    });

    it('should throw when target user not found', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockAdminMember);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.addWorkspaceMember('ws-1', 'user-1', {
        userId: 'no-such-user',
        role: WorkspaceMemberRole.MEMBER,
      })).rejects.toThrow('User not found');
    });

    it('should throw when user is already a member', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)   // user-1 is admin
        .mockResolvedValueOnce(mockMember);        // user-2 is already a member
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(WorkspaceService.addWorkspaceMember('ws-1', 'user-1', {
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      })).rejects.toThrow('User is already a member of this workspace');
    });
  });

  describe('getWorkspaceMembers', () => {
    it('should return paginated members with user info', async () => {
      const mockMemberUser = { ...mockUser, id: 'user-2' };
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(mockWorkspace);
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(1);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockMemberUser);

      const result = await WorkspaceService.getWorkspaceMembers('ws-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.id).toBe('user-2');
    });

    it('should throw when workspace not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.getWorkspaceMembers('no-such-ws'))
        .rejects.toThrow('Workspace not found');
    });
  });

  describe('updateWorkspaceMemberRole', () => {
    it('should update role when requester is owner', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)  // user-1 is OWNER
        .mockResolvedValueOnce(mockMember);       // member to update

      mockPrisma.workspaceMember.update.mockResolvedValueOnce({
        ...mockMember,
        role: WorkspaceMemberRole.ADMIN,
      });

      const result = await WorkspaceService.updateWorkspaceMemberRole('ws-1', 'user-1', 'user-2', {
        role: WorkspaceMemberRole.ADMIN,
      });

      expect(result.role).toBe(WorkspaceMemberRole.ADMIN);
    });

    it('should throw when requester is not owner', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockMember);

      await expect(WorkspaceService.updateWorkspaceMemberRole('ws-1', 'user-2', 'user-3', {
        role: WorkspaceMemberRole.ADMIN,
      })).rejects.toThrow('Permission denied: only owner can change member roles');
    });

    it('should throw when member not found', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)  // owner check
        .mockResolvedValueOnce(null);             // member not found

      await expect(WorkspaceService.updateWorkspaceMemberRole('ws-1', 'user-1', 'no-such-user', {
        role: WorkspaceMemberRole.ADMIN,
      })).rejects.toThrow('Member not found');
    });

    it('should throw when trying to change owner role', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)  // user-1 is OWNER
        .mockResolvedValueOnce(mockAdminMember);  // target is also the owner

      await expect(WorkspaceService.updateWorkspaceMemberRole('ws-1', 'user-1', 'user-1', {
        role: WorkspaceMemberRole.MEMBER,
      })).rejects.toThrow('Cannot remove owner role. Delete workspace instead.');
    });
  });

  describe('removeWorkspaceMember', () => {
    it('should remove member when requester is owner', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)  // owner check
        .mockResolvedValueOnce(mockMember);       // member to remove
      mockPrisma.workspaceMember.delete.mockResolvedValueOnce(mockMember);

      await WorkspaceService.removeWorkspaceMember('ws-1', 'user-1', 'user-2');
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalled();
    });

    it('should throw when requester is not owner', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockMember);

      await expect(WorkspaceService.removeWorkspaceMember('ws-1', 'user-2', 'user-3'))
        .rejects.toThrow('Permission denied: only owner can remove members');
    });

    it('should throw when member not found', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)
        .mockResolvedValueOnce(null);

      await expect(WorkspaceService.removeWorkspaceMember('ws-1', 'user-1', 'no-such-user'))
        .rejects.toThrow('Member not found');
    });

    it('should throw when trying to remove owner', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(mockAdminMember)  // owner check
        .mockResolvedValueOnce(mockAdminMember);  // target is owner

      await expect(WorkspaceService.removeWorkspaceMember('ws-1', 'user-1', 'user-1'))
        .rejects.toThrow('Cannot remove workspace owner. Delete workspace instead.');
    });
  });

  describe('getUserRoleInWorkspace', () => {
    it('should return role for member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockAdminMember);

      const role = await WorkspaceService.getUserRoleInWorkspace('ws-1', 'user-1');
      expect(role).toBe(WorkspaceMemberRole.OWNER);
    });

    it('should return null for non-member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      const role = await WorkspaceService.getUserRoleInWorkspace('ws-1', 'no-such-user');
      expect(role).toBeNull();
    });
  });

  describe('hasWorkspacePermission / canAccessWorkspace', () => {
    it('should return true when user has sufficient role', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockMember);

      const result = await WorkspaceService.hasWorkspacePermission('ws-1', 'user-2');
      expect(result).toBe(true);
    });

    it('should return false when user is not a member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      const result = await WorkspaceService.hasWorkspacePermission('ws-1', 'no-such-user');
      expect(result).toBe(false);
    });

    it('should return false when role hierarchy is insufficient', async () => {
      const guestMember = { ...mockMember, role: WorkspaceMemberRole.GUEST };
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(guestMember);

      const result = await WorkspaceService.hasWorkspacePermission(
        'ws-1', 'user-2', WorkspaceMemberRole.ADMIN
      );
      expect(result).toBe(false);
    });

    it('should delegate canAccessWorkspace to hasWorkspacePermission', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockMember);

      const result = await WorkspaceService.canAccessWorkspace('ws-1', 'user-2');
      expect(result).toBe(true);
    });
  });

  describe('leaveWorkspace', () => {
    it('should remove member from workspace', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockMember);
      mockPrisma.workspaceMember.delete.mockResolvedValueOnce(mockMember);

      await WorkspaceService.leaveWorkspace('ws-1', 'user-2');
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalled();
    });

    it('should throw when not a member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(WorkspaceService.leaveWorkspace('ws-1', 'no-such-user'))
        .rejects.toThrow('You are not a member of this workspace');
    });

    it('should throw when owner tries to leave', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockAdminMember);

      await expect(WorkspaceService.leaveWorkspace('ws-1', 'user-1'))
        .rejects.toThrow('Owner cannot leave workspace. Transfer ownership or delete workspace.');
    });
  });
});
