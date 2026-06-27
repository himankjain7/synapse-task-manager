import axios from 'axios';
import { Config } from '../constants/config';
import { transformError } from '../utils/error';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.API_TIMEOUT,
});

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const { useAuthStore } = require('../store/authStore');
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    console.log("[DEBUG api.ts REQUEST]", { method: config.method, url: config.url, baseURL: config.baseURL, fullURL: config.baseURL + config.url, authHeader: config.headers.Authorization ? 'Bearer ...' : 'MISSING' });

    return config;
  },
  (error) => Promise.reject(transformError(error))
);

// Response Interceptor: Transform errors & handle 401
// Standard envelope: { success, data, error, timestamp }
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    console.log("[DEBUG api.ts RESPONSE]", { status: response.status, url: response.config?.url, data: body });
  
    if (body && body.success === false) {
      return Promise.reject(transformError({
        response: {
          status: response.status,
          data: body,
        },
      }));
    }
    return response;
  },
  (error) => {
    console.log("[DEBUG api.ts ERROR]", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(transformError(error));
  }
);

export default api;