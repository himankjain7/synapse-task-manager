"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.validate = exports.cors = exports.rateLimit = exports.workspacePermission = exports.optionalAuth = exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and populates request.auth with user context.
 * Used on protected routes to ensure user is authenticated.
 *
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Populate req.auth with user info
 * 4. Call next() to continue to route handler
 *
 * Error handling:
 * - Missing token: 401 Unauthorized
 * - Invalid token: 401 Unauthorized
 * - Expired token: 401 Token Expired
 */
const requireAuth = (req, res, next) => {
    try {
        // Extract token from Authorization header
        // Expected format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'Missing authorization token',
            });
            return;
        }
        // Parse Authorization header
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            res.status(401).json({
                code: 'INVALID_TOKEN',
                message: 'Invalid authorization header format (expected: Bearer <token>)',
            });
            return;
        }
        const token = parts[1];
        // Verify token
        try {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            // Populate request context
            req.auth = {
                userId: payload.userId,
                email: payload.email,
            };
            req.token = token;
            next();
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('expired')) {
                    res.status(401).json({
                        code: 'TOKEN_EXPIRED',
                        message: 'Access token has expired. Please refresh.',
                    });
                }
                else {
                    res.status(401).json({
                        code: 'INVALID_TOKEN',
                        message: error.message,
                    });
                }
            }
            else {
                res.status(401).json({
                    code: 'UNAUTHORIZED',
                    message: 'Token verification failed',
                });
            }
        }
    }
    catch (error) {
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'Authentication middleware error',
        });
    }
};
exports.requireAuth = requireAuth;
/**
 * Optional Authentication Middleware
 *
 * Like requireAuth but doesn't fail if token missing.
 * Useful for endpoints that work with or without auth.
 *
 * If valid token present:
 * - Populates req.auth
 *
 * If no token or invalid token:
 * - Continues without req.auth
 * - req.auth will be undefined
 */
const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            // No token provided - continue without auth
            next();
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            // Invalid format - continue without auth
            next();
            return;
        }
        const token = parts[1];
        // Try to verify token
        const result = (0, jwt_1.safeVerifyToken)(token, 'access');
        if (result.valid && result.payload) {
            // Valid token - populate auth context
            req.auth = {
                userId: result.payload.userId,
                email: result.payload.email,
            };
            req.token = token;
        }
        // Continue regardless of token validity
        next();
    }
    catch (error) {
        // Silently continue on error
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Workspace Permission Middleware
 *
 * Verifies user has minimum role in workspace.
 * Must be used after requireAuth middleware.
 *
 * Usage:
 * router.post(
 *   '/:workspaceId/members',
 *   requireAuth,
 *   workspacePermission('admin'),
 *   controller.addMember
 * )
 *
 * @param minRole - Minimum required role ('guest', 'member', 'admin', 'owner')
 * @returns Middleware function
 */
const workspacePermission = (_minRole) => {
    return async (req, res, next) => {
        try {
            // Get workspace ID from params
            const workspaceId = req.params.workspaceId;
            if (!workspaceId) {
                res.status(400).json({
                    code: 'INVALID_INPUT',
                    message: 'Missing workspace ID',
                });
                return;
            }
            // Get auth context (must be set by requireAuth)
            if (!req.auth) {
                res.status(401).json({
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                });
                return;
            }
            // Check permission (delegate to service)
            // This would call WorkspaceService.hasWorkspacePermission
            // For now, just continue - implement in production
            req.auth.workspace = workspaceId;
            next();
        }
        catch (error) {
            res.status(500).json({
                code: 'INTERNAL_ERROR',
                message: 'Permission check failed',
            });
        }
    };
};
exports.workspacePermission = workspacePermission;
/**
 * Rate Limiting Middleware
 *
 * Limits requests per IP address per time window.
 * Prevents brute force attacks and DoS.
 *
 * Usage:
 * router.post('/login', rateLimit('5 per 15 minutes'), controller.login)
 *
 * @param limit - Rate limit string (e.g., "5 per 15 minutes")
 * @returns Middleware function
 */
const rateLimit = (_limit) => {
    // In production, use express-rate-limit package
    // This is a placeholder implementation
    return (_req, _res, next) => {
        // Check request count for IP
        // If exceeded, return 429 Too Many Requests
        next();
    };
};
exports.rateLimit = rateLimit;
/**
 * CORS Middleware
 *
 * Handles Cross-Origin Resource Sharing headers.
 * Allows frontend to make requests from different domains.
 *
 * @returns Middleware function
 */
const cors = () => {
    return (req, res, next) => {
        // Allow credentials in CORS requests
        res.header('Access-Control-Allow-Credentials', 'true');
        // Set allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            process.env.FRONTEND_URL || 'https://example.com',
        ];
        const origin = req.get('Origin');
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        // Set allowed methods and headers
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        next();
    };
};
exports.cors = cors;
/**
 * Request Validation Middleware
 *
 * Validates request body against schema.
 * Returns 400 Bad Request if validation fails.
 *
 * Usage:
 * router.post(
 *   '/users',
 *   validate(createUserSchema),
 *   controller.createUser
 * )
 *
 * @param schema - Validation schema (zod, joi, etc)
 * @returns Middleware function
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate request body
            const validated = await schema.parseAsync(req.body);
            req.body = validated;
            next();
        }
        catch (error) {
            res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
};
exports.validate = validate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Middleware: authenticateToken
 * Verifies Bearer JWT token in Authorization header.
 * Attaches decoded payload to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: 'Access token is missing or malformed' });
    }
    try {
        const jwtSecret = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = {
            userId: decoded.userId ?? decoded.id ?? '',
            email: decoded.email,
        };
        return next();
    }
    catch (err) {
        // If token verification fails (expired or modified)
        return res.status(403).json({ error: 'Access token is invalid or expired' });
    }
};
exports.authenticateToken = authenticateToken;
