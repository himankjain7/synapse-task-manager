import axios from 'axios';
import { Config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { transformError } from '../utils/error';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth JWT Header
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(transformError(error));
  }
);

// Response Interceptor: Transform errors & handle 401 token invalidation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const transformed = transformError(error);
    
    if (transformed.status === 401) {
      // Invalidate auth state in store
      useAuthStore.getState().logout();
    }
    
    return Promise.reject(transformed);
  }
);

export default api;
