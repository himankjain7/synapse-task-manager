import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { GoogleAuthService } from '../services/GoogleAuthService';
import authMiddleware from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const googleSchema = z.object({
  code: z.string().min(10),
});

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  status: 'ok' | 'error';
};

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
router.post('/auth/signup', authMiddleware.validateInput('signup'), async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.parse(req.body);

    const result = await AuthService.signup(parsed.email, parsed.password, parsed.name);

    const payload: ApiResponse<typeof result> = { data: result, error: null, status: 'ok' };
    res.status(201).json(payload);
  } catch (err: any) {
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
router.post('/auth/login', authMiddleware.rateLimiter, authMiddleware.validateInput('login'), async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);

    const result = await AuthService.login(parsed.email, parsed.password);

    res.status(200).json({ data: result, error: null, status: 'ok' } as ApiResponse<typeof result>);
  } catch (err: any) {
    const error = { code: 'AUTH_FAILED', message: err?.message || 'Invalid credentials' };
    res.status(401).json({ data: null, error, status: 'error' });
  }
});

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Response: { data: { accessToken, refreshToken }, error, status }
 */
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const parsed = refreshSchema.parse(req.body);

    const result = await AuthService.refreshToken(parsed.refreshToken);

    res.status(200).json({ data: result, error: null, status: 'ok' } as ApiResponse<typeof result>);
  } catch (err: any) {
    const error = { code: 'REFRESH_FAILED', message: err?.message || 'Invalid refresh token' };
    res.status(401).json({ data: null, error, status: 'error' });
  }
});

/**
 * POST /auth/google
 * Body: { code }
 * Exchange Google auth code for user and tokens
 */
router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const parsed = googleSchema.parse(req.body);

    const result = await GoogleAuthService.completeOAuthFlow(parsed.code);

    res.status(200).json({ data: result, error: null, status: 'ok' } as ApiResponse<typeof result>);
  } catch (err: any) {
    const error = { code: 'GOOGLE_AUTH_FAILED', message: err?.message || 'Google authentication failed' };
    res.status(400).json({ data: null, error, status: 'error' });
  }
});

/**
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 * Action: Blacklist token (revocation)
 */
router.post('/auth/logout', authMiddleware.authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization as string | undefined;
    const token = authHeader?.split(' ')[1];
    if (token) {
      await AuthService.revokeToken(token);
    }

    res.status(200).json({ data: { success: true }, error: null, status: 'ok' });
  } catch (err: any) {
    const error = { code: 'LOGOUT_FAILED', message: err?.message || 'Failed to logout' };
    res.status(500).json({ data: null, error, status: 'error' });
  }
});

/**
 * GET /auth/me
 * Headers: Authorization: Bearer <token>
 * Returns authenticated user info
 */
router.get('/auth/me', authMiddleware.authenticateToken, async (req: Request, res: Response) => {
  try {
    // For now return minimal auth context; services can enrich if needed
    const user = req.auth ?? null;
    res.status(200).json({ data: { user }, error: null, status: 'ok' });
  } catch (err: any) {
    const error = { code: 'ME_FAILED', message: err?.message || 'Failed to fetch user' };
    res.status(500).json({ data: null, error, status: 'error' });
  }
});

export default router;
