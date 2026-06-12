import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth.service';
import { WorkspaceMemberRole } from '../models';

/**
 * Augment Express Request to include auth context
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email?: string;
        role?: WorkspaceMemberRole | string;
        [key: string]: unknown;
      };
    }
  }
}

/**
 * authenticateToken
 *
 * Extracts a JWT from the `Authorization` header (Bearer <token>), verifies it,
 * and attaches a minimal `req.auth` object containing `userId`, `email` and any
 * other claims returned by the verification function.
 *
 * On invalid or missing token, returns 401 Unauthorized.
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing Authorization header' });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid Authorization header format' });
      return;
    }

    const token = parts[1];
    // Verify token using AuthService - throws on invalid/expired
    const payload = await AuthService.verifyJWT(token);

    // Attach auth context to request
    req.auth = {
      userId: payload.userId as string,
      email: payload.email as string | undefined,
      // preserve other claims if any (e.g., role)
      ...(payload as Record<string, unknown>),
    };

    next();
  } catch (err) {
    res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
  }
};

/**
 * requireAuth
 *
 * Ensures the request is authenticated. Should be called after
 * `authenticateToken` or used as a guard where authentication is mandatory.
 * Returns 401 if `req.auth` is missing.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth || !req.auth.userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  next();
};

/**
 * requireRole
 *
 * Middleware factory that checks the authenticated user's role.
 * Accepts either a `WorkspaceMemberRole` enum value or a string role name.
 * If the user's role is missing or insufficient, responds with 403 Forbidden.
 *
 * Example usage:
 * router.patch('/admin-only', authenticateToken, requireRole(WorkspaceMemberRole.ADMIN), handler)
 */
export const requireRole = (minimumRole: WorkspaceMemberRole | string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const userRole = req.auth.role;
    if (userRole === undefined || userRole === null) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'User role not found' });
      return;
    }

    // If both are numeric enums, allow numeric comparison
    if (typeof userRole === 'number' && typeof minimumRole === 'number') {
      if ((userRole as number) < (minimumRole as number)) {
        res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role privileges' });
        return;
      }
      next();
      return;
    }

    // Otherwise compare as strings (case-insensitive)
    if (String(userRole).toLowerCase() !== String(minimumRole).toLowerCase()) {
      // Allow equality only for string roles (could be expanded to hierarchy if desired)
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role privileges' });
      return;
    }

    next();
  };
};

/**
 * rateLimiter
 *
 * Express rate limiter configured for login/sign-up endpoints.
 * Limits to 5 requests per minute per IP. Returns 429 with a JSON response
 * when the limit is exceeded. `express-rate-limit` provides hooks for
 * headers (RFC) and works in production behind proxies when `trust proxy`
 * is configured in Express.
 */
export const rateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Use IP address as key. If behind a proxy, ensure express `trust proxy` is set.
    return req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({ code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' });
  },
});

/**
 * validateInput
 *
 * Simple request body validation for signup/login endpoints. Ensures required
 * fields exist and are sensible. This is intentionally conservative — keep
 * authentication validation centralized here so controllers remain thin.
 *
 * Usage: router.post('/signup', validateInput('signup'), controller.signup)
 */
export const validateInput = (mode: 'signup' | 'login') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field?: string; message: string }> = [];

    const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const password = (req.body && req.body.password) ? String(req.body.password) : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      errors.push({ field: 'email', message: 'Invalid email address' });
    }

    if (!password || password.length < 8 || password.length > 72) {
      errors.push({ field: 'password', message: 'Password must be between 8 and 72 characters' });
    }

    if (mode === 'signup') {
      const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
      if (!name || name.length === 0 || name.length > 100) {
        errors.push({ field: 'name', message: 'Name is required (1-100 chars)' });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'Validation failed', errors });
      return;
    }

    // Normalize email for downstream services
    req.body.email = email.toLowerCase();

    next();
  };
};

export default {
  authenticateToken,
  requireAuth,
  requireRole,
  rateLimiter,
  validateInput,
};
