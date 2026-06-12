import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { asyncHandler } from '../middleware/error.middleware';
import { CreateUserRequest, LoginRequest } from '../models';

/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication operations:
 * - User signup/registration
 * - User login
 * - Token refresh
 * - Logout (token revocation)
 * - Google OAuth flow
 *
 * Routes delegate business logic to AuthService and GoogleAuthService.
 * Controller is responsible for:
 * - Extracting request data
 * - Calling service methods
 * - Formatting responses
 * - Setting cookies for refresh tokens
 */
export class AuthController {
  /**
   * POST /auth/signup
   * Register a new user
   *
   * Request body:
   * {
   *   email: string,
   *   password: string,
   *   name: string,
   *   avatarUrl?: string
   * }
   *
   * Response: 201 Created
   * {
   *   user: { id, email, name, avatarUrl, createdAt, updatedAt },
   *   token: JWT access token,
   *   expiresIn: 900 (seconds)
   * }
   *
   * Errors:
   * - 400: Invalid input (password too weak)
   * - 409: Email already registered
   * - 500: Server error
   */
  static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, avatarUrl }: CreateUserRequest = req.body;

    // Call service
    const user = await AuthService.signup(email, password, name, avatarUrl);

    // Response (201 Created)
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
      timestamp: new Date(),
    });
  });

  /**
   * POST /auth/login
   * Authenticate user with email and password
   *
   * Request body:
   * {
   *   email: string,
   *   password: string
   * }
   *
   * Response: 200 OK
   * {
   *   user: { id, email, name, avatarUrl, createdAt, updatedAt },
   *   token: JWT access token,
   *   expiresIn: 900 (seconds)
   * }
   *
   * Errors:
   * - 401: Invalid credentials (generic message for security)
   * - 400: Missing email or password
   * - 500: Server error
   */
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginRequest = req.body;

    // Call service
    const result = await AuthService.login(email, password);

    // Set refresh token in httpOnly cookie
    // Client sends access token in Authorization header
    // Refresh token is used when access token expires
    res.cookie('refreshToken', result.token, {
      httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Response
    res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful',
      timestamp: new Date(),
    });
  });

  /**
   * POST /auth/refresh
   * Exchange refresh token for new access token
   *
   * Refresh token should be sent as:
   * - Cookie (httpOnly, auto-sent by browser)
   * - OR request body: { refreshToken: string }
   *
   * Response: 200 OK
   * {
   *   accessToken: new JWT token,
   *   expiresIn: 900 (seconds)
   * }
   *
   * Errors:
   * - 401: Invalid or expired refresh token
   * - 401: Refresh token revoked (logged out)
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Refresh token required',
        timestamp: new Date(),
      });
      return;
    }

    // Call service
    const result = await AuthService.refreshToken(refreshToken);

    // Send new refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Response
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
      },
      timestamp: new Date(),
    });
  });

  /**
   * POST /auth/logout
   * Logout user (revoke refresh token)
   *
   * Revokes refresh token so it cannot be reused.
   * Access token remains valid until expiration (15 min),
   * after which client must re-authenticate.
   *
   * Response: 200 OK
   */
  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Revoke token (add to blacklist)
      await AuthService.revokeToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date(),
    });
  });

  /**
   * GET /auth/google/login
   * Generate Google login URL
   *
   * Frontend redirects user to returned URL.
   * User grants permissions on Google consent screen.
   * Google redirects back to callback endpoint with auth code.
   *
   * Query params:
   * ?state=<random> (CSRF token, frontend must provide and validate)
   *
   * Response: 200 OK
   * {
   *   url: "https://accounts.google.com/o/oauth2/v2/auth?..." (redirect URL)
   * }
   */
  static getGoogleLoginUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get state parameter from query (CSRF token)
    const state = req.query.state as string;

    if (!state) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'State parameter required for CSRF protection',
        timestamp: new Date(),
      });
      return;
    }

    // Generate Google login URL
    const url = GoogleAuthService.getAuthURL(state);

    res.status(200).json({
      success: true,
      data: { url },
      timestamp: new Date(),
    });
  });

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback
   *
   * Google redirects here with auth code after user grants permissions.
   * Exchange code for tokens and create or link user account.
   *
   * Query params:
   * ?code=<authorization_code> (from Google)
   * ?state=<csrf_token> (for CSRF validation)
   *
   * Response: 200 OK (or redirect to frontend with tokens)
   * {
   *   user: { id, email, name, avatarUrl },
   *   token: JWT access token,
   *   expiresIn: 900
   * }
   *
   * Errors:
   * - 400: Missing code parameter
   * - 401: Code invalid or expired
   * - 409: Email already exists (another OAuth provider)
   */
  static googleCallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Authorization code required',
        timestamp: new Date(),
      });
      return;
    }

    // Validate state parameter (CSRF protection)
    const sessionState = req.session?.oauthState;
    if (state !== sessionState) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'CSRF token mismatch',
        timestamp: new Date(),
      });
      return;
    }

    // Complete OAuth flow: code -> tokens -> user
    const result = await GoogleAuthService.completeOAuthFlow(code);

    // Set refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Response
    res.status(200).json({
      success: true,
      data: result,
      message: 'Google login successful',
      timestamp: new Date(),
    });
  });

  /**
   * GET /auth/me
   * Get current authenticated user
   *
   * Returns user info from JWT token.
   * Requires valid access token.
   *
   * Response: 200 OK
   * {
   *   user: { id, email, name, avatarUrl, createdAt, updatedAt }
   * }
   *
   * Errors:
   * - 401: No valid token
   */
  static getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Auth context should be set by requireAuth middleware
    if (!req.auth) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date(),
      });
      return;
    }

    // TODO: Fetch full user from database
    // For now, return data from token
    res.status(200).json({
      success: true,
      data: req.auth,
      timestamp: new Date(),
    });
  });

  /**
   * POST /auth/verify-token
   * Verify if token is valid
   *
   * Useful for client-side auth state validation.
   *
   * Request body:
   * {
   *   token: JWT access token
   * }
   *
   * Response: 200 OK
   * {
   *   valid: boolean,
   *   payload: { userId, email } (if valid)
   * }
   */
  static verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Token required',
        timestamp: new Date(),
      });
      return;
    }

    try {
      const payload = await AuthService.verifyJWT(token);

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          payload,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(200).json({
        success: true,
        data: {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid token',
        },
        timestamp: new Date(),
      });
    }
  });
}

