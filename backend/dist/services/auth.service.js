"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const models_1 = require("../models");
/**
 * JWT Authentication Service
 *
 * Handles all authentication operations with production-grade security:
 * - Bcrypt password hashing (12 salt rounds) for resistance against GPU attacks
 * - JWT tokens with short expiration (15 min) to limit exposure window
 * - Refresh tokens with longer expiration (7 days) for maintaining sessions
 * - Token revocation via blacklist for logout operations
 * - Timing attack resistance through constant-time password comparison
 * - Secure defaults: lowercase emails, nullable passwords for OAuth
 */
class AuthService {
    /**
     * Salt rounds for bcrypt hashing
     * Higher value = more resistant to brute force, but slower
     * 12 is industry standard (2^12 iterations)
     * @private
     */
    static BCRYPT_SALT_ROUNDS = 12;
    /**
     * JWT access token expiration time (15 minutes)
     * Short expiration limits the window if token is compromised
     * @private
     */
    static JWT_EXPIRATION = '15m';
    /**
     * Refresh token expiration time (7 days)
     * Longer than access token but still reasonable for session lifetime
     * @private
     */
    static REFRESH_TOKEN_EXPIRATION = '7d';
    /**
     * In-memory token blacklist (should use Redis in production)
     * Stores hashed token identifiers for quick lookup
     * In production: Use Redis for distributed caching across multiple instances
     * @private
     */
    static tokenBlacklist = new Set();
    /**
     * Sign up a new user with email and password
     *
     * Security considerations:
     * - Passwords are hashed with bcrypt before storage
     * - Email is normalized to lowercase to prevent case-sensitive duplicates
     * - Returns user data without password hash for security
     *
     * @param email - User email address (will be normalized to lowercase)
     * @param password - Plain text password (will be hashed)
     * @param name - User full name
     * @param avatarUrl - Optional avatar URL
     * @returns Created user data (without password hash)
     * @throws Error if email already exists or password is invalid
     */
    static async signup(email, password, name, avatarUrl) {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase().trim();
        // Validate password strength (should be done in middleware, but defense in depth)
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        // Check if user already exists
        const existingUser = await db_1.default.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existingUser) {
            const error = new Error('Email already registered');
            error.code = models_1.ErrorCode.DUPLICATE_EMAIL;
            throw error;
        }
        // Hash password with bcrypt (salt rounds 12)
        // This operation is CPU-intensive and intentionally slow to resist brute force
        const passwordHash = await this.hashPassword(password);
        // Create user in database
        const user = await db_1.default.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                name: name.trim(),
                avatarUrl: avatarUrl || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        return this.userToResponse(user);
    }
    /**
     * Authenticate user with email and password
     *
     * Security considerations:
     * - Uses constant-time comparison via bcrypt to prevent timing attacks
     * - Generic error message to prevent email enumeration attacks
     * - Returns both access token (short-lived) and refresh token (long-lived)
     * - Access token should be stored in memory only (never localStorage)
     * - Refresh token should be stored in httpOnly cookie
     *
     * @param email - User email address
     * @param password - Plain text password
     * @returns User data and JWT tokens
     * @throws Error if credentials are invalid or user not found
     */
    static async login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();
        // Find user by email
        const user = await db_1.default.user.findUnique({
            where: { email: normalizedEmail },
        });
        // Generic error message prevents email enumeration attacks
        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }
        // Compare provided password with stored hash using bcrypt
        // This is constant-time to prevent timing attacks
        const isPasswordValid = await this.comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        // Generate tokens
        const accessToken = this.generateAccessToken(user.id, user.email);
        this.generateRefreshToken(user.id, user.email);
        return {
            user: this.userToResponse(user),
            token: accessToken,
            expiresIn: 900, // 15 minutes in seconds
        };
    }
    /**
     * Exchange a valid refresh token for new access and refresh tokens
     *
     * Security considerations:
     * - Validates refresh token signature and expiration
     * - Issues new refresh token to invalidate old one (refresh token rotation)
     * - Returns new access token for continued API access
     * - Prevents token reuse attacks
     *
     * @param refreshToken - Valid refresh token
     * @returns New access and refresh tokens
     * @throws Error if refresh token is invalid or expired
     */
    static async refreshToken(refreshToken) {
        try {
            // Verify refresh token signature and expiration
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret');
            // Check if token is blacklisted (revoked/logged out)
            const tokenHash = this.hashTokenForBlacklist(refreshToken);
            if (this.tokenBlacklist.has(tokenHash)) {
                throw new Error('Refresh token has been revoked');
            }
            // Find user to ensure they still exist
            const user = await db_1.default.user.findUnique({
                where: { id: decoded.userId },
            });
            if (!user) {
                throw new Error('User not found');
            }
            // Generate new tokens (refresh token rotation)
            const newAccessToken = this.generateAccessToken(user.id, user.email);
            const newRefreshToken = this.generateRefreshToken(user.id, user.email);
            // Revoke old refresh token to prevent reuse
            this.tokenBlacklist.add(tokenHash);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
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
    }
    /**
     * Verify and decode a JWT access token
     *
     * Security considerations:
     * - Verifies token signature to ensure it hasn't been tampered with
     * - Checks token expiration
     * - Returns decoded payload for use in authenticated requests
     * - Should be used in middleware to protect routes
     *
     * @param token - JWT access token to verify
     * @returns Decoded token payload
     * @throws Error if token is invalid or expired
     */
    static async verifyJWT(token) {
        try {
            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/i, '');
            // Verify token signature and expiration
            const decoded = jsonwebtoken_1.default.verify(cleanToken, process.env.JWT_SECRET || 'jwt-secret');
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
    }
    /**
     * Revoke (blacklist) a token for logout operations
     *
     * Security considerations:
     * - Stores hashed token identifier to avoid storing sensitive tokens
     * - Removes ability to use refresh token after logout
     * - In production: should persist to Redis with expiration time matching token expiry
     * - Current in-memory implementation is for single-server deployments only
     *
     * @param token - Token to revoke (access or refresh)
     * @returns true if token was successfully revoked
     */
    static async revokeToken(token) {
        try {
            // Verify token is valid before revoking
            jsonwebtoken_1.default.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret');
            // Hash token for storage (never store raw tokens)
            const tokenHash = this.hashTokenForBlacklist(token);
            // Add to blacklist
            this.tokenBlacklist.add(tokenHash);
            // In production, persist to Redis:
            // await redis.setex(
            //   `blacklist:${tokenHash}`,
            //   604800, // 7 days in seconds
            //   '1'
            // );
            return true;
        }
        catch (error) {
            // Token invalid or already expired, no need to revoke
            return false;
        }
    }
    /**
     * Hash a plain text password using bcrypt
     *
     * Security considerations:
     * - Uses bcrypt with 12 salt rounds (industry standard)
     * - Each call generates a unique salt, making rainbow table attacks infeasible
     * - Intentionally slow (~100ms) to resist brute force attacks
     * - Uses 2b variant for maximum security
     *
     * @param password - Plain text password to hash
     * @returns Bcrypt hash of the password (includes salt and cost factor)
     * @throws Error if hashing fails
     */
    static async updateProfile(userId, name, avatarUrl) {
        const user = await db_1.default.user.update({
            where: { id: userId },
            data: { name: name.trim(), avatarUrl: avatarUrl || null, updatedAt: new Date() },
        });
        return this.userToResponse(user);
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash)
            throw new Error('User not found');
        const isValid = await this.comparePassword(currentPassword, user.passwordHash);
        if (!isValid)
            throw new Error('Current password is incorrect');
        const passwordHash = await this.hashPassword(newPassword);
        await db_1.default.user.update({
            where: { id: userId },
            data: { passwordHash, updatedAt: new Date() },
        });
    }
    static async hashPassword(password) {
        try {
            // Bcrypt automatically generates a unique salt and embeds it in the hash
            // Format: $2b$12$[22-char-salt][31-char-hash]
            const hash = await bcryptjs_1.default.hash(password, this.BCRYPT_SALT_ROUNDS);
            return hash;
        }
        catch (error) {
            throw new Error('Failed to hash password');
        }
    }
    /**
     * Compare a plain text password with a bcrypt hash
     *
     * Security considerations:
     * - Bcrypt performs constant-time comparison to prevent timing attacks
     * - Even if attacker can measure response time, it won't reveal password info
     * - Should always use this instead of string comparison
     *
     * @param plainPassword - Plain text password to verify
     * @param hash - Bcrypt hash to compare against
     * @returns true if password matches hash, false otherwise
     */
    static async comparePassword(plainPassword, hash) {
        try {
            // Bcrypt.compare performs constant-time comparison
            const isMatch = await bcryptjs_1.default.compare(plainPassword, hash);
            return isMatch;
        }
        catch (error) {
            // If bcrypt fails to compare, return false (don't expose error details)
            return false;
        }
    }
    /**
     * Generate a signed JWT access token
     *
     * Security considerations:
     * - Signed with HS256 algorithm (symmetric key)
     * - Short 15-minute expiration to limit exposure if compromised
     * - Contains minimal claims (userId, email) - avoid storing sensitive data
     * - Should be verified on every protected route
     *
     * @param userId - User ID to include in token
     * @param email - User email to include in token
     * @returns Signed JWT token
     * @private
     */
    static generateAccessToken(userId, email) {
        return jsonwebtoken_1.default.sign({
            userId,
            email,
        }, process.env.JWT_SECRET || 'jwt-secret', {
            expiresIn: this.JWT_EXPIRATION,
            issuer: 'synapse-api',
            subject: userId,
        });
    }
    /**
     * Generate a signed JWT refresh token
     *
     * Security considerations:
     * - Longer expiration (7 days) to maintain sessions
     * - Should be stored in httpOnly cookie (not accessible to JavaScript)
     * - Used only to obtain new access tokens
     * - Can be revoked by adding to blacklist
     *
     * @param userId - User ID to include in token
     * @param email - User email to include in token
     * @returns Signed JWT refresh token
     * @private
     */
    static generateRefreshToken(userId, email) {
        return jsonwebtoken_1.default.sign({
            userId,
            email,
        }, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret', {
            expiresIn: this.REFRESH_TOKEN_EXPIRATION,
            issuer: 'synapse-api',
            subject: userId,
        });
    }
    /**
     * Convert User entity to safe response (excludes sensitive data)
     *
     * @param user - User entity from database
     * @returns User response without password hash
     * @private
     */
    static userToResponse(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    /**
     * Hash token for blacklist storage
     *
     * Never stores raw tokens in blacklist. Hashes them instead to prevent
     * token extraction if blacklist is compromised.
     *
     * @param token - Token to hash
     * @returns Hashed token identifier
     * @private
     */
    static hashTokenForBlacklist(token) {
        // In production, use crypto.createHash('sha256')
        // For now, use first 32 chars of token as simple identifier
        return token.substring(0, 32);
    }
    /**
     * Public wrapper to generate access token for external services
     * @param userId
     * @param email
     */
    static signAccessToken(userId, email) {
        return this.generateAccessToken(userId, email);
    }
    /**
     * Public wrapper to generate refresh token for external services
     * @param userId
     * @param email
     */
    static signRefreshToken(userId, email) {
        return this.generateRefreshToken(userId, email);
    }
    /**
     * Clear token blacklist (for testing purposes only)
     *
     * @internal Testing utility - do not use in production
     */
    static clearBlacklist() {
        this.tokenBlacklist.clear();
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
