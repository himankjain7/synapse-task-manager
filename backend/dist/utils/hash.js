"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidBcryptHash = exports.validatePasswordStrength = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Password Hashing Utilities
 *
 * Provides secure password hashing and comparison functions using bcrypt.
 * Bcrypt is designed specifically for password hashing with:
 * - Automatic salt generation and embedding
 * - Configurable work factor (cost) for future-proofing
 * - Constant-time comparison to prevent timing attacks
 */
/**
 * Salt rounds for bcrypt hashing
 * 12 iterations = 2^12 = 4096 computational rounds
 * Takes approximately 100-200ms per hash (intentionally slow)
 * Recommended by OWASP: 12-14 rounds (2023+)
 */
const SALT_ROUNDS = 12;
/**
 * Hash a plain text password using bcrypt
 *
 * Security characteristics:
 * - Generates cryptographically random salt each time
 * - Salt is embedded in output hash (safe to store in DB)
 * - Cannot be reversed (one-way function)
 * - Resistant to rainbow table attacks (random salt)
 * - Resistant to GPU/ASIC brute force (slow, memory-hard)
 * - Future-proof: can increase SALT_ROUNDS as computers get faster
 *
 * Output format: $2b$12$[22-char-salt][31-char-hash]
 * - $2b: bcrypt algorithm version (2b is latest, most secure)
 * - $12: cost factor (4096 iterations)
 * - Next 22 characters: random salt
 * - Last 31 characters: password hash
 *
 * @param password - Plain text password to hash (max 72 bytes - bcrypt limitation)
 * @returns Promise resolving to bcrypt hash string (safe to store)
 * @throws Error if hashing fails (disk I/O, invalid input, etc)
 *
 * @example
 * const hash = await hashPassword('user123password');
 * // hash: '$2b$12$...' (stored in database)
 */
const hashPassword = async (password) => {
    try {
        // Validate password length (bcrypt max 72 bytes)
        if (password.length > 72) {
            throw new Error('Password exceeds maximum length of 72 bytes');
        }
        if (password.length === 0) {
            throw new Error('Password cannot be empty');
        }
        // Generate hash with specified salt rounds
        // bcrypt automatically generates random salt
        const hash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        return hash;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Password hashing failed: ${error.message}`);
        }
        throw new Error('Password hashing failed');
    }
};
exports.hashPassword = hashPassword;
/**
 * Compare plain text password with bcrypt hash
 *
 * Security characteristics:
 * - Uses constant-time comparison (bcrypt.compare)
 * - Prevents timing attacks (execution time doesn't leak info)
 * - Extracts and validates salt from stored hash
 * - Safe for login authentication
 *
 * Timing attack prevention:
 * - Bcrypt.compare always takes ~100-200ms regardless of match result
 * - Attacker cannot determine if password is partially correct
 * - Makes brute force attempts impractical (~36 seconds per guess)
 *
 * @param plainPassword - Plain text password to verify
 * @param hash - Bcrypt hash from database
 * @returns Promise resolving to true if match, false otherwise
 * @throws Error only for unexpected failures (never for mismatch)
 *
 * @example
 * const hash = await hashPassword('password123');
 * const isMatch = await comparePassword('password123', hash); // true
 * const isMismatch = await comparePassword('wrong', hash); // false
 */
const comparePassword = async (password, hash) => {
    try {
        // Validate inputs
        if (!password || !hash) {
            return false;
        }
        // Compare password with hash using constant-time comparison
        const isMatch = await bcryptjs_1.default.compare(password, hash);
        return isMatch;
    }
    catch (error) {
        // If bcrypt comparison fails, return false
        // This prevents exposing error details (e.g., "hash format invalid")
        // In real auth, also log this for security monitoring
        console.error('Password comparison error:', error);
        return false;
    }
};
exports.comparePassword = comparePassword;
/**
 * Validate password strength
 *
 * Returns validation result with specific feedback for UX.
 * Does not reject weak passwords (frontend should enforce stronger rules).
 * Backend should have strict minimum requirements:
 * - Minimum 8 characters
 * - Minimum 1 uppercase letter
 * - Minimum 1 lowercase letter
 * - Minimum 1 number
 * - Minimum 1 special character
 *
 * @param password - Password to validate
 * @returns Object with validation result and feedback messages
 */
const validatePasswordStrength = (password) => {
    const feedback = [];
    // Minimum length
    if (password.length < 8) {
        feedback.push('Password must be at least 8 characters');
    }
    // Maximum length (bcrypt limitation)
    if (password.length > 72) {
        feedback.push('Password must not exceed 72 characters');
    }
    // Character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasUppercase) {
        feedback.push('Password should contain uppercase letters (A-Z)');
    }
    if (!hasLowercase) {
        feedback.push('Password should contain lowercase letters (a-z)');
    }
    if (!hasNumbers) {
        feedback.push('Password should contain numbers (0-9)');
    }
    if (!hasSpecialChar) {
        feedback.push('Password should contain special characters (!@#$%^&*)');
    }
    return {
        isStrong: feedback.length === 0 && password.length >= 8,
        feedback,
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
/**
 * Check if hash is valid bcrypt hash
 *
 * Validates hash format before attempting comparison.
 * Bcrypt hashes start with $2a$, $2b$, or $2x$.
 *
 * @param hash - String to validate
 * @returns true if hash appears to be valid bcrypt format
 */
const isValidBcryptHash = (hash) => {
    // Bcrypt hash format: $2a$12$... or $2b$12$... or $2x$12$...
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
    return bcryptRegex.test(hash);
};
exports.isValidBcryptHash = isValidBcryptHash;
