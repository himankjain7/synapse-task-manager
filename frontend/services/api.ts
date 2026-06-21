import axios from 'axios';
import { Config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { transformError } from '../utils/error';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.API_TIMEOUT,
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
  (response) => {
    console.log('[API] SUCCESS:', response.config?.method?.toUpperCase(), response.config?.url, 'status:', response.status);
    return response;
  },
  (error) => {
    console.log('[API] ERROR URL:', error.config?.url);
    console.log('[API] ERROR STATUS:', error.response?.status);
    console.log('[API] ERROR DATA:', error.response?.data);
    console.log('[API] ERROR MESSAGE:', error.message);
    console.log('[API] ERROR CODE:', error.code);
    console.log('[API] HAS RESPONSE:', !!error.response);
    console.log('[API] HAS REQUEST:', !!error.request);
    if (error.request) {
      console.log('[API] REQUEST method:', error.request.method);
      console.log('[API] REQUEST url:', error.request.url);
    }

    return Promise.reject(transformError(error));
  }
);

export default api;