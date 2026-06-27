import api from './api';

export interface Attachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export const attachmentApi = {
  list: async (taskId: string): Promise<Attachment[]> => {
    const response = await api.get(`/api/v1/tasks/${taskId}/attachments`);
    return response.data.data;
  },

  upload: async (taskId: string, file: FormData): Promise<Attachment> => {
    const response = await api.post(`/api/v1/tasks/${taskId}/attachments`, file, {
      transformRequest: [(data) => data],
    });
    return response.data.data;
  },

  delete: async (taskId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/attachments/${id}`);
  },
};
