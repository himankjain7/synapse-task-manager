"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const GoogleAuthService_1 = require("../services/GoogleAuthService");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(72),
    name: zod_1.z.string().min(1).max(100),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(72),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10),
});
const googleSchema = zod_1.z.object({
    code: zod_1.z.string().min(10),
});
/**
 * POST /auth/signup
 * Body: { email, password, name }
 * Response: { data: { user, accessToken, refreshToken }, error, status }
 *
 * Example Request:
 * {
 *   "email": "alice@example.com",
 *   "password": "S3cureP@ss!",
 *   "name": "Alice"
 * }
 *
 * Example Response:
 * {
 *   "data": { "user": { ... }, "accessToken": "...", "refreshToken": "..." },
 *   "error": null,
 *   "status": "ok"
 * }
 */
router.post('/auth/signup', auth_1.default.validateInput('signup'), async (req, res) => {
    try {
        const parsed = signupSchema.parse(req.body);
        const result = await auth_service_1.AuthService.signup(parsed.email, parsed.password, parsed.name);
        const payload = { data: result, error: null, status: 'ok' };
        res.status(201).json(payload);
    }
    catch (err) {
        const error = { code: 'SIGNUP_FAILED', message: err?.message || 'Failed to signup' };
        res.status(400).json({ data: null, error, status: 'error' });
    }
});
/**
 * POST /auth/login
 * Body: { email, password }
 * Rate-limited to 5 attempts per minute per IP
 * Response: { data: { user, accessToken, refreshToken }, error, status }
 */
router.post('/auth/login', auth_1.default.rateLimiter, auth_1.default.validateInput('login'), async (req, res) => {
    try {
        const parsed = loginSchema.parse(req.body);
        const result = await auth_service_1.AuthService.login(parsed.email, parsed.password);
        res.status(200).json({ data: result, error: null, status: 'ok' });
    }
    catch (err) {
        const error = { code: 'AUTH_FAILED', message: err?.message || 'Invalid credentials' };
        res.status(401).json({ data: null, error, status: 'error' });
    }
});
/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Response: { data: { accessToken, refreshToken }, error, status }
 */
router.post('/auth/refresh', async (req, res) => {
    try {
        const parsed = refreshSchema.parse(req.body);
        const result = await auth_service_1.AuthService.refreshToken(parsed.refreshToken);
        res.status(200).json({ data: result, error: null, status: 'ok' });
    }
    catch (err) {
        const error = { code: 'REFRESH_FAILED', message: err?.message || 'Invalid refresh token' };
        res.status(401).json({ data: null, error, status: 'error' });
    }
});
/**
 * POST /auth/google
 * Body: { code }
 * Exchange Google auth code for user and tokens
 */
router.post('/auth/google', async (req, res) => {
    try {
        const parsed = googleSchema.parse(req.body);
        const result = await GoogleAuthService_1.GoogleAuthService.completeOAuthFlow(parsed.code);
        res.status(200).json({ data: result, error: null, status: 'ok' });
    }
    catch (err) {
        const error = { code: 'GOOGLE_AUTH_FAILED', message: err?.message || 'Google authentication failed' };
        res.status(400).json({ data: null, error, status: 'error' });
    }
});
/**
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 * Action: Blacklist token (revocation)
 */
router.post('/auth/logout', auth_1.default.authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (token) {
            await auth_service_1.AuthService.revokeToken(token);
        }
        res.status(200).json({ data: { success: true }, error: null, status: 'ok' });
    }
    catch (err) {
        const error = { code: 'LOGOUT_FAILED', message: err?.message || 'Failed to logout' };
        res.status(500).json({ data: null, error, status: 'error' });
    }
});
/**
 * GET /auth/me
 * Headers: Authorization: Bearer <token>
 * Returns authenticated user info
 */
router.get('/auth/me', auth_1.default.authenticateToken, auth_1.default.requireAuth, async (req, res) => {
    try {
        // For now return minimal auth context; services can enrich if needed
        const user = req.auth ?? null;
        res.status(200).json({ data: { user }, error: null, status: 'ok' });
    }
    catch (err) {
        const error = { code: 'ME_FAILED', message: err?.message || 'Failed to fetch user' };
        res.status(500).json({ data: null, error, status: 'error' });
    }
});
exports.default = router;
