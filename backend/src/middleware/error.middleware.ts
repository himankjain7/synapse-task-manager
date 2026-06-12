import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../models';

/**
 * Custom API Error Class
 *
 * Extends Error with status code and error code for consistent error handling.
 * All thrown errors should be instances of this class.
 *
 * @example
 * throw new APIError(400, ErrorCode.INVALID_INPUT, 'Invalid user ID');
 */
export class APIError extends Error {
  constructor(
    public statusCode: number = 500,
    public code: ErrorCode | string = ErrorCode.INTERNAL_ERROR,
    message: string = 'Internal server error'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Validation Error Class
 *
 * Extends APIError for validation failures with detailed field errors.
 */
export class ValidationErrorDetail extends APIError {
  constructor(
    public errors: Array<{ field: string; message: string; value?: unknown }> = []
  ) {
    super(400, ErrorCode.VALIDATION_ERROR, 'Validation failed');
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error Class
 *
 * For 404 responses when resource doesn't exist.
 */
export class NotFoundError extends APIError {
  constructor(resource: string, id?: string) {
    super(
      404,
      ErrorCode.NOT_FOUND,
      `${resource} not found${id ? ` (ID: ${id})` : ''}`
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized Error Class
 *
 * For 401 responses (authentication required).
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized access') {
    super(401, ErrorCode.UNAUTHORIZED, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error Class
 *
 * For 403 responses (permission denied).
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden access') {
    super(403, ErrorCode.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict Error Class
 *
 * For 409 responses (resource already exists).
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict') {
    super(409, ErrorCode.ALREADY_EXISTS, message);
    this.name = 'ConflictError';
  }
}

/**
 * Too Many Requests Error Class
 *
 * For 429 responses (rate limited).
 */
export class RateLimitError extends APIError {
  constructor(message: string = 'Too many requests') {
    super(429, ErrorCode.INTERNAL_ERROR, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown by routes and formats them consistently.
 * Should be the last middleware in the Express app.
 *
 * Error handling flow:
 * 1. Check if error is APIError instance
 * 2. If yes, use its status code and message
 * 3. If no, log error and return generic 500
 * 4. Send error response with consistent format
 * 5. Never expose internal error details in production
 *
 * Usage:
 * app.use(errorHandler);
 */
// Duplicate errorHandler removed; using the comprehensive version defined later in the file.


/**
 * 404 Not Found Handler
 *
 * Handles requests to non-existent routes.
 * Should be placed after all other routes.
 *
 * Usage:
 * app.use(notFoundHandler);
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    code: ErrorCode.NOT_FOUND,
    message: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date(),
  });
};

/**
 * Async Route Wrapper
 *
 * Wraps async route handlers to catch errors and pass to error handler.
 * Prevents "unhandled rejection" errors.
 *
 * Usage:
 * router.post('/users', asyncHandler(controller.createUser));
 *
 * @param handler - Async route handler function
 * @returns Wrapped handler that catches errors
 */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

/**
 * Safe Route Wrapper with Auto-Response
 *
 * Wraps route handler and automatically sends JSON response.
 * Useful for reducing boilerplate in controllers.
 *
 * Usage:
 * router.post('/users', safeRoute(async (req, res) => {
 *   const user = await UserService.createUser(req.body);
 *   return { success: true, data: user };
 * }));
 *
 * @param handler - Route handler function
 * @returns Wrapped handler
 */
export const safeRoute =
  (handler: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await handler(req, res);

      // If handler already sent response, don't send again
      if (res.headersSent) {
        return;
      }

      // Send result as JSON
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  };

/**
 * Safe Route Wrapper with Status Code
 *
 * Like safeRoute but allows specifying HTTP status code.
 *
 * Usage:
 * router.post('/users', safeRouteWithStatus(201, async (req, res) => {
 *   const user = await UserService.createUser(req.body);
 *   return user;
 * }));
 *
 * @param statusCode - HTTP status code to return
 * @param handler - Route handler function
 * @returns Wrapped handler
 */
export const safeRouteWithStatus =
  (statusCode: number, handler: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await handler(req, res);

      if (res.headersSent) {
        return;
      }

      res.status(statusCode).json({
        success: true,
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  };
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Global Error Handler Middleware
 * Intercepts errors thrown down the request stack, providing unified JSON formatting.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 1. Zod Request Schema Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // 2. Prisma Database Constraint Failures
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': { // Unique constraint violation (e.g. duplicate email)
        const target = (err.meta?.target as string[]) || [];
        return res.status(409).json({
          error: `Record duplicate found`,
          details: `Field constraint violation on: ${target.join(', ')}`,
        });
      }
      case 'P2003': { // Foreign key constraint violation
        return res.status(400).json({
          error: 'Foreign key constraint failed',
          details: 'The referenced parent record does not exist or has deletion restrictions.',
        });
      }
      case 'P2025': { // Record to update/delete not found
        return res.status(404).json({
          error: 'Record not found',
          details: err.message || 'The requested database record does not exist.',
        });
      }
      default:
        break;
    }
  }

  // Log unknown internal errors for debugging
  console.error('[Unhandled Internal Exception]:', err);

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'A server error occurred.' : err.message,
  });
};
