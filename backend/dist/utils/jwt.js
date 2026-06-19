"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserId = exports.generateTokenPair = exports.isTokenExpiringSoon = exports.getTokenExpiration = exports.decodeTokenWithoutVerification = exports.safeVerifyToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * JWT Token Utilities
 *
 * Handles creation and verification of JWT tokens for authentication.
 * Implements production-ready security practices:
 * - Separate secrets for access and refresh tokens
 * - Configurable expiration times
 * - Proper error handling for expired/invalid tokens
 * - Token claims validation
 */
/**
 * JWT access token secret
 * Should be strong, random, and kept secure in environment
 * Recommended: 32+ random characters
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
/**
 * JWT refresh token secret
 * Should be different from access token secret
 * Allows rotating access tokens without forcing re-login
 */
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_only_for_local_debugging_replace_in_production';
/**
 * Generate a short-lived access token (expires in 15 minutes)
 *
 * Security considerations:
 * - Short expiration (15 min) limits damage if token is compromised
 * - Should be stored in memory only (not localStorage)
 * - Sent in Authorization header with each request
 * - If compromised, damage is limited to short time window
 * - Requires refresh token to maintain sessions
 *
 * @param userId - User ID to include in token
 * @param email - User email to include in token
 * @returns Signed JWT access token
 * @throws Error if token generation fails
 */
const generateAccessToken = (userId, email) => {
    const payload = {
        userId,
        email,
    };
    const options = {
        expiresIn: '15m', // 15 minutes
        issuer: 'synapse-api', // Identifies token issuer
        subject: userId, // Identifies the subject (user)
        algorithm: 'HS256', // HMAC with SHA-256
    };
    try {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
    }
    catch (error) {
        throw new Error(`Failed to generate access token: ${error}`);
    }
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate a long-lived refresh token (expires in 7 days)
 *
 * Security considerations:
 * - Longer expiration (7 days) maintains user session
 * - Should be stored in httpOnly cookie (not accessible via JavaScript)
 * - Not sent with every request (only for token refresh)
 * - Different secret than access token (keys never mixed)
 * - Can be revoked by adding to blacklist
 * - Supports token rotation (old token invalidated on refresh)
 *
 * @param userId - User ID to include in token
 * @param email - User email to include in token
 * @returns Signed JWT refresh token
 * @throws Error if token generation fails
 */
const generateRefreshToken = (userId, email) => {
    const payload = {
        userId,
        email,
    };
    const options = {
        expiresIn: '7d', // 7 days
        issuer: 'synapse-api',
        subject: userId,
        algorithm: 'HS256',
    };
    try {
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, options);
    }
    catch (error) {
        throw new Error(`Failed to generate refresh token: ${error}`);
    }
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Verify and decode an access token
 *
 * Validates:
 * - Token signature (hasn't been tampered with)
 * - Token expiration (not expired)
 * - Token claims (valid structure)
 * - Token issuer (matches expected issuer)
 *
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
const verifyAccessToken = (token) => {
    try {
        // Remove 'Bearer ' prefix if present
        const cleanToken = token.replace(/^Bearer\s+/i, '');
        const options = {
            issuer: 'synapse-api',
            algorithms: ['HS256'],
        };
        const decoded = jsonwebtoken_1.default.verify(cleanToken, JWT_SECRET, options);
        // Validate required fields
        if (!decoded.userId || !decoded.email) {
            throw new Error('Token missing required fields');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Access token has expired');
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid access token');
        }
        throw error;
    }
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify and decode a refresh token
 *
 * Similar to access token verification but uses different secret.
 * Used for obtaining new access tokens without re-authenticating.
 *
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    try {
        const options = {
            issuer: 'synapse-api',
            algorithms: ['HS256'],
        };
        const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET, options);
        // Validate required fields
        if (!decoded.userId || !decoded.email) {
            throw new Error('Token missing required fields');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Refresh token has expired');
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Safely verify token without throwing (returns result object)
 *
 * Useful when you want to handle errors gracefully without try/catch.
 * Returns object indicating success/failure with decoded payload or error.
 *
 * @param token - Token to verify
 * @param type - Token type: 'access' or 'refresh'
 * @returns Object with valid flag and payload or error message
 */
const safeVerifyToken = (token, type = 'access') => {
    try {
        const payload = type === 'access' ? (0, exports.verifyAccessToken)(token) : (0, exports.verifyRefreshToken)(token);
        return { valid: true, payload };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Token verification failed',
        };
    }
};
exports.safeVerifyToken = safeVerifyToken;
/**
 * Decode token without verification (for debugging/inspection)
 *
 * WARNING: Does NOT verify signature. Use only for:
 * - Debugging
 * - Inspecting token structure
 * - Pre-validation checks
 *
 * NEVER use for security decisions - always verify first!
 *
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid format
 */
const decodeTokenWithoutVerification = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: false });
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.decodeTokenWithoutVerification = decodeTokenWithoutVerification;
/**
 * Get token expiration time
 *
 * Useful for:
 * - Determining when to refresh token
 * - Checking if token is about to expire
 * - Client-side token management
 *
 * @param token - JWT token
 * @returns Expiration time in milliseconds since epoch, or null if invalid
 */
const getTokenExpiration = (token) => {
    const decoded = (0, exports.decodeTokenWithoutVerification)(token);
    if (decoded?.exp) {
        return decoded.exp * 1000; // JWT exp is in seconds, convert to milliseconds
    }
    return null;
};
exports.getTokenExpiration = getTokenExpiration;
/**
 * Check if token is about to expire (within threshold)
 *
 * @param token - JWT token
 * @param thresholdMs - Milliseconds before expiration to consider "about to expire" (default: 5 min)
 * @returns true if token expires within threshold
 */
const isTokenExpiringSoon = (token, thresholdMs = 5 * 60 * 1000) => {
    const expiration = (0, exports.getTokenExpiration)(token);
    if (!expiration) {
        return true; // Invalid token is considered expired
    }
    const now = Date.now();
    return expiration - now < thresholdMs;
};
exports.isTokenExpiringSoon = isTokenExpiringSoon;
/**
 * Create a token pair (access + refresh)
 *
 * Convenience function for generating both tokens at once.
 * Used during login and token refresh operations.
 *
 * @param userId - User ID
 * @param email - User email
 * @returns Object with both tokens
 */
const generateTokenPair = (userId, email) => {
    return {
        accessToken: (0, exports.generateAccessToken)(userId, email),
        refreshToken: (0, exports.generateRefreshToken)(userId, email),
    };
};
exports.generateTokenPair = generateTokenPair;
/**
 * Extract user ID from token
 *
 * Safely extracts user ID without full verification.
 * Useful for logging and tracing.
 *
 * @param token - JWT token
 * @returns User ID or null if invalid/missing
 */
const extractUserId = (token) => {
    const decoded = (0, exports.decodeTokenWithoutVerification)(token);
    return decoded?.userId || null;
};
exports.extractUserId = extractUserId;
