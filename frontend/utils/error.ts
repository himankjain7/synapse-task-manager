export class ApiError extends Error {
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status?: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const transformError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && typeof error === 'object') {
    // Handling Axios error responses
    if (error.response) {
      const data = error.response.data;
      const status = error.response.status;
      
      // New envelope format: error field is the primary message
      const message = data?.error || data?.message || error.message || 'An unexpected error occurred';
      const code = data?.code;
      const errors = data?.errors;
      
      return new ApiError(message, status, code, errors);
    }
    
    // Handling requests that did not receive a response
    if (error.request) {
      return new ApiError(
        'Unable to connect to the server. Please check your internet connection.',
        503,
        'NETWORK_ERROR'
      );
    }
  }

  return new ApiError(
    error?.message || 'An unexpected error occurred. Please try again.',
    500,
    'UNKNOWN_ERROR'
  );
};
