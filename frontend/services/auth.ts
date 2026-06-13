import api from './api';
import { User } from '../store/authStore';

interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

interface AuthApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MeResponse {
  userId: string;
  email: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<AuthApiResponse<LoginResponse>>('/api/v1/auth/login', { email, password });
    return response.data.data;
  },

  register: async (email: string, password: string, name: string): Promise<User> => {
    const response = await api.post<AuthApiResponse<User>>('/api/v1/auth/signup', { email, password, name });
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Swallow logout errors — we clear local state regardless
    }
  },

  getMe: async (): Promise<MeResponse> => {
    const response = await api.get<AuthApiResponse<MeResponse>>('/api/v1/auth/me');
    return response.data.data;
  },
};
