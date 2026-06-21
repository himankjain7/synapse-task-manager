"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
/**
 * Authentication Routes
 *
 * Endpoints:
 * - POST /auth/signup - Register new user
 * - POST /auth/login - Login with email/password
 * - POST /auth/refresh - Exchange refresh token for new access token
 * - POST /auth/logout - Logout (revoke refresh token)
 * - GET /auth/google/login - Get Google OAuth login URL
 * - GET /auth/google/callback - Handle Google OAuth callback
 * - GET /auth/me - Get current user
 * - POST /auth/verify-token - Verify if token is valid
 *
 * Security:
 * - signup/login: Email + password validation before processing
 * - logout: Revokes refresh token to prevent reuse
 * - Token refresh: Rotates tokens (old refresh token invalidated)
 * - Google OAuth: CSRF protection via state parameter
 */
const router = (0, express_1.Router)();
/**
 * POST /auth/signup
 * Register a new user
 *
 * Middleware chain:
 * 1. validateBody - Ensure request body exists
 * 2. validateRequired - Check email, password, name are present
 * 3. validateEmailField - Validate and normalize email
 * 4. validatePasswordField - Validate password strength
 * 5. sanitizeFields - Remove dangerous characters
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
 */
router.post('/signup', validation_middleware_1.validateBody, (0, validation_middleware_1.validateRequired)(['email', 'password', 'name']), (0, validation_middleware_1.validateEmailField)('email'), (0, validation_middleware_1.validatePasswordField)('password'), (0, validation_middleware_1.sanitizeFields)(['name', 'avatarUrl']), auth_controller_1.AuthController.signup);
/**
 * POST /auth/login
 * Authenticate user with email and password
 *
 * Middleware chain:
 * 1. validateBody
 * 2. validateRequired - Check email and password
 * 3. validateEmailField - Validate email
 * 4. validatePasswordField - Validate password format
 *
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Response: 200 OK
 * Sets refreshToken in httpOnly cookie (auto-sent on future requests)
 */
router.post('/login', validation_middleware_1.validateBody, (0, validation_middleware_1.validateRequired)(['email', 'password']), (0, validation_middleware_1.validateEmailField)('email'), auth_controller_1.AuthController.login);
/**
 * POST /auth/refresh
 * Exchange refresh token for new access token
 *
 * Refresh token can be provided as:
 * - httpOnly cookie (auto-sent by browser) - preferred
 * - request body: { refreshToken: string }
 *
 * When token is refreshed:
 * - New access token issued (15 min expiration)
 * - New refresh token issued (7 day expiration)
 * - Old refresh token is invalidated (prevents replay attacks)
 *
 * Response: 200 OK
 * New access token (refresh token in cookie)
 */
router.post('/refresh', auth_controller_1.AuthController.refreshToken);
/**
 * POST /auth/logout
 * Logout user (revoke refresh token)
 *
 * Revokes the refresh token so it cannot be used again.
 * Access token remains valid until expiration (15 min).
 *
 * Clears refreshToken cookie.
 *
 * Response: 200 OK
 */
router.post('/logout', auth_controller_1.AuthController.logout);
/**
 * GET /auth/google/login
 * Get Google OAuth login URL
 *
 * Frontend should:
 * 1. Generate random state parameter for CSRF protection
 * 2. Call this endpoint with state in query params
 * 3. Redirect user to returned URL
 * 4. User grants permissions on Google consent screen
 * 5. Google redirects to /auth/google/callback
 *
 * Query params:
 * ?state=<random_csrf_token>
 *
 * Response: 200 OK
 * {
 *   url: "https://accounts.google.com/o/oauth2/v2/auth?..." (redirect URL)
 * }
 */
router.get('/google/login', auth_controller_1.AuthController.getGoogleLoginUrl);
/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 *
 * Google redirects here after user grants permissions.
 * Exchanges authorization code for tokens.
 * Creates or links user account.
 *
 * Query params:
 * ?code=<authorization_code> (from Google)
 * ?state=<csrf_token> (must match session state)
 *
 * Response: 200 OK
 * Returns user and tokens (same as login)
 */
router.get('/google/callback', auth_controller_1.AuthController.googleCallback);
/**
 * GET /auth/me
 * Get current authenticated user
 *
 * Returns user information from JWT token.
 * Requires valid access token (Bearer token in Authorization header).
 *
 * Middleware chain:
 * 1. requireAuth - Verify JWT token and extract user info
 *
 * Response: 200 OK
 * {
 *   id: string,
 *   email: string,
 *   name: string,
 *   avatarUrl?: string,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.AuthController.getMe);
/**
 * POST /auth/verify-token
 * Verify if token is valid
 *
 * Useful for client-side auth state validation.
 * Doesn't require authentication (token passed in body).
 *
 * Request body:
 * {
 *   token: string (JWT to verify)
 * }
 *
 * Response: 200 OK
 * {
 *   valid: boolean,
 *   payload?: { userId, email } (if valid),
 *   error?: string (if invalid)
 * }
 */
router.post('/verify-token', auth_controller_1.AuthController.verifyToken);
router.patch('/profile', auth_middleware_1.requireAuth, auth_controller_1.AuthController.updateProfile);
router.post('/change-password', auth_middleware_1.requireAuth, auth_controller_1.AuthController.changePassword);
exports.default = router;
