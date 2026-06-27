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

import { AttachmentService } from '../../src/services/attachment.service';

const mockTask = { id: 'task-1', projectId: 'proj-1', title: 'T', description: null, status: 'todo', priority: 'medium', assignedTo: null, dueDate: null, position: 1, completedAt: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null, project: { id: 'proj-1', workspaceId: 'ws-1', name: 'P' } };
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'P', description: null, color: '#000', ownerId: 'user-1', status: 'active', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockWm = { id: 'wm-1', workspaceId: 'ws-1', userId: 'user-1', role: 'admin', createdAt: new Date('2024-01-01'), deletedAt: null };
const mockUser = { id: 'user-1', email: 'u@e.com', name: 'User', avatarUrl: null, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') };
const mockAttachment = { id: 'a1', taskId: 'task-1', uploadedBy: 'user-1', fileName: 'doc.pdf', fileUrl: '/uploads/doc.pdf', mimeType: 'application/pdf', size: 1024, createdAt: new Date('2024-01-01'), uploader: { name: 'User' } };
const mockFile = { originalname: 'doc.pdf', filename: 'doc-uuid.pdf', mimetype: 'application/pdf', size: 1024, path: '/tmp/doc-uuid.pdf' } as Express.Multer.File;

function mockCanAccessProject() {
  mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
  mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(mockWm);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('AttachmentService', () => {
  describe('upload', () => {
    it('should upload an attachment', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.attachment.create.mockResolvedValueOnce(mockAttachment);

      const result = await AttachmentService.upload('task-1', 'user-1', mockFile);

      expect(result.fileName).toBe('doc.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(AttachmentService.upload('task-x', 'user-1', mockFile)).rejects.toThrow('Task not found');
    });
  });

  describe('list', () => {
    it('should list attachments for a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockCanAccessProject();
      mockPrisma.attachment.findMany.mockResolvedValueOnce([mockAttachment]);

      const result = await AttachmentService.list('task-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('doc.pdf');
    });

    it('should throw when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);
      await expect(AttachmentService.list('task-x', 'user-1')).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('should delete own attachment', async () => {
      mockPrisma.attachment.findUnique.mockResolvedValueOnce(mockAttachment);

      await AttachmentService.delete('a1', 'user-1');

      expect(mockPrisma.attachment.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('should throw when attachment not found', async () => {
      mockPrisma.attachment.findUnique.mockResolvedValueOnce(null);
      await expect(AttachmentService.delete('a-x', 'user-1')).rejects.toThrow('Attachment not found');
    });

    it('should throw when not the uploader', async () => {
      mockPrisma.attachment.findUnique.mockResolvedValueOnce(mockAttachment);
      await expect(AttachmentService.delete('a1', 'user-2')).rejects.toThrow('Permission denied');
    });
  });
});
