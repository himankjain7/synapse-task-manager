import api from './api';

export interface SearchResult {
  workspaces: { id: string; name: string; type: 'workspace' }[];
  projects: { id: string; name: string; workspaceId: string; type: 'project' }[];
  tasks: { id: string; title: string; projectId: string; status: string; type: 'task' }[];
  labels: { id: string; name: string; color: string; type: 'label' }[];
}

export const searchApi = {
  global: async (query: string, workspaceId?: string): Promise<SearchResult> => {
    const response = await api.get('/api/v1/search', { params: { q: query, workspaceId } });
    return response.data.data;
  },
};
