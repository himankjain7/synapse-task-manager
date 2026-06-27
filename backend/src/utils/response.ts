import { Response } from 'express';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiEnvelope<T> = {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, statusCode: number, error: string): void {
  const body: ApiEnvelope<null> = {
    success: false,
    data: null,
    error,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}
