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
    console.log('[ATTACHMENT-API] Sending upload, FormData keys:', [...(file as any)._parts?.map((p: any) => p[0]) || []]);
    const response = await api.post(`/api/v1/tasks/${taskId}/attachments`, file, {
      transformRequest: [(data) => data],
    });
    console.log('[ATTACHMENT-API] Upload response:', response.status, response.data);
    return response.data.data;
  },

  delete: async (taskId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/attachments/${id}`);
  },
};
