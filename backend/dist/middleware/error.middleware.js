"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.safeRouteWithStatus = exports.safeRoute = exports.asyncHandler = exports.notFoundHandler = exports.RateLimitError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationErrorDetail = exports.APIError = void 0;
const models_1 = require("../models");
/**
 * Custom API Error Class
 *
 * Extends Error with status code and error code for consistent error handling.
 * All thrown errors should be instances of this class.
 *
 * @example
 * throw new APIError(400, ErrorCode.INVALID_INPUT, 'Invalid user ID');
 */
class APIError extends Error {
    statusCode;
    code;
    constructor(statusCode = 500, code = models_1.ErrorCode.INTERNAL_ERROR, message = 'Internal server error') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
/**
 * Validation Error Class
 *
 * Extends APIError for validation failures with detailed field errors.
 */
class ValidationErrorDetail extends APIError {
    errors;
    constructor(errors = []) {
        super(400, models_1.ErrorCode.VALIDATION_ERROR, 'Validation failed');
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
exports.ValidationErrorDetail = ValidationErrorDetail;
/**
 * Not Found Error Class
 *
 * For 404 responses when resource doesn't exist.
 */
class NotFoundError extends APIError {
    constructor(resource, id) {
        super(404, models_1.ErrorCode.NOT_FOUND, `${resource} not found${id ? ` (ID: ${id})` : ''}`);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Unauthorized Error Class
 *
 * For 401 responses (authentication required).
 */
class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized access') {
        super(401, models_1.ErrorCode.UNAUTHORIZED, message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Forbidden Error Class
 *
 * For 403 responses (permission denied).
 */
class ForbiddenError extends APIError {
    constructor(message = 'Forbidden access') {
        super(403, models_1.ErrorCode.FORBIDDEN, message);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Conflict Error Class
 *
 * For 409 responses (resource already exists).
 */
class ConflictError extends APIError {
    constructor(message = 'Resource conflict') {
        super(409, models_1.ErrorCode.ALREADY_EXISTS, message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Too Many Requests Error Class
 *
 * For 429 responses (rate limited).
 */
class RateLimitError extends APIError {
    constructor(message = 'Too many requests') {
        super(429, models_1.ErrorCode.INTERNAL_ERROR, message);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
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
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        code: models_1.ErrorCode.NOT_FOUND,
        message: `Route not found: ${req.method} ${req.path}`,
        timestamp: new Date(),
    });
};
exports.notFoundHandler = notFoundHandler;
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
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
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
const safeRoute = (handler) => async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.safeRoute = safeRoute;
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
const safeRouteWithStatus = (statusCode, handler) => async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.safeRouteWithStatus = safeRouteWithStatus;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
/**
 * Global Error Handler Middleware
 * Intercepts errors thrown down the request stack, providing unified JSON formatting.
 */
const errorHandler = (err, _req, res, _next) => {
    // 1. Zod Request Schema Validation Errors
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }
    // 2. Prisma Database Constraint Failures
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': { // Unique constraint violation (e.g. duplicate email)
                const target = err.meta?.target || [];
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
exports.errorHandler = errorHandler;
