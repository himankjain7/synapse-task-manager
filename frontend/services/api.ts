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

let isLoggingOut = false;

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(transformError(error))
);

// Response Interceptor: Transform errors & handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const transformed = transformError(error);

    if (transformed.status === 401 && !isLoggingOut) {
      isLoggingOut = true;

      try {
        await useAuthStore.getState().logout();
      } finally {
        isLoggingOut = false;
      }
    }

    return Promise.reject(transformed);
  }
);

export default api;