"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.sanitizeFields = exports.validatePasswordField = exports.validateEmailField = exports.validateRequired = exports.validateBody = exports.validatePagination = exports.validateUUID = exports.createValidationErrorResponse = exports.isValidPagination = exports.isValidURL = exports.isValidColor = exports.isValidDate = exports.isValidEnum = exports.isValidLength = exports.isValidUUID = exports.validatePassword = exports.isValidEmail = void 0;
/**
 * Request Validation Middleware
 *
 * Validates common request patterns and data types.
 * Returns 400 Bad Request with detailed error messages if validation fails.
 *
 * Can be chained with specific validators for route-specific validation.
 */
/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns true if valid email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
};
exports.isValidEmail = isValidEmail;
/**
 * Validate password strength
 *
 * Checks:
 * - Minimum 8 characters
 * - Contains uppercase, lowercase, number
 * - Not too long (bcrypt limitation)
 *
 * @param password - Password to validate
 * @returns Object with isValid and feedback array
 */
const validatePassword = (password) => {
    const feedback = [];
    if (password.length < 8) {
        feedback.push('Password must be at least 8 characters');
    }
    if (password.length > 72) {
        feedback.push('Password must not exceed 72 characters');
    }
    if (!/[A-Z]/.test(password)) {
        feedback.push('Password must contain uppercase letters');
    }
    if (!/[a-z]/.test(password)) {
        feedback.push('Password must contain lowercase letters');
    }
    if (!/\d/.test(password)) {
        feedback.push('Password must contain numbers');
    }
    return {
        isValid: feedback.length === 0,
        feedback,
    };
};
exports.validatePassword = validatePassword;
/**
 * Validate UUID format
 *
 * @param id - ID to validate
 * @returns true if valid UUID v4
 */
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};
exports.isValidUUID = isValidUUID;
/**
 * Validate string length
 *
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns true if valid
 */
const isValidLength = (value, min = 1, max = 255) => {
    if (!value || typeof value !== 'string') {
        return false;
    }
    const trimmed = value.trim();
    return trimmed.length >= min && trimmed.length <= max;
};
exports.isValidLength = isValidLength;
/**
 * Validate enum value
 *
 * @param value - Value to validate
 * @param enumValues - Allowed values
 * @returns true if value in enum
 */
const isValidEnum = (value, enumValues) => {
    return enumValues.includes(value);
};
exports.isValidEnum = isValidEnum;
/**
 * Validate date
 *
 * @param value - Date to validate
 * @param minDate - Minimum allowed date (optional)
 * @returns true if valid date
 */
const isValidDate = (value, minDate) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return false;
    }
    if (minDate && date < minDate) {
        return false;
    }
    return true;
};
exports.isValidDate = isValidDate;
/**
 * Validate color format
 *
 * Accepts hex colors (#RRGGBB or #RGB)
 *
 * @param color - Color string to validate
 * @returns true if valid hex color
 */
const isValidColor = (color) => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
};
exports.isValidColor = isValidColor;
/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns true if valid URL
 */
const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.isValidURL = isValidURL;
/**
 * Validate pagination parameters
 *
 * @param page - Page number
 * @param limit - Items per page
 * @returns true if valid pagination
 */
const isValidPagination = (page, limit) => {
    return page >= 1 && limit >= 1 && limit <= 100;
};
exports.isValidPagination = isValidPagination;
/**
 * Create validation error response
 *
 * @param errors - Array of validation errors
 * @returns Error response object
 */
const createValidationErrorResponse = (errors) => {
    return {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        errors,
        timestamp: new Date(),
    };
};
exports.createValidationErrorResponse = createValidationErrorResponse;
/**
 * Middleware: Validate UUID in route params
 *
 * Usage: router.get('/:id', validateUUID('id'), handler)
 *
 * @param paramName - Name of UUID param in route
 * @returns Middleware function
 */
const validateUUID = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id || !(0, exports.isValidUUID)(id)) {
            res.status(400).json((0, exports.createValidationErrorResponse)([
                {
                    field: paramName,
                    message: 'Invalid UUID format',
                    value: id,
                },
            ]));
            return;
        }
        next();
    };
};
exports.validateUUID = validateUUID;
/**
 * Middleware: Validate pagination query params
 *
 * Ensures page and limit are valid numbers within acceptable range.
 *
 * Usage: router.get('/items', validatePagination, handler)
 *
 * @returns Middleware function
 */
const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    if (!(0, exports.isValidPagination)(page, limit)) {
        res.status(400).json((0, exports.createValidationErrorResponse)([
            {
                field: 'page',
                message: 'Page must be >= 1',
                value: page,
            },
            {
                field: 'limit',
                message: 'Limit must be between 1 and 100',
                value: limit,
            },
        ]));
        return;
    }
    req.query.page = page.toString();
    req.query.limit = limit.toString();
    next();
};
exports.validatePagination = validatePagination;
/**
 * Middleware: Validate JSON body exists
 *
 * Ensures request has JSON body with at least one property.
 *
 * Usage: router.post('/items', validateBody, handler)
 *
 * @returns Middleware function
 */
const validateBody = (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json((0, exports.createValidationErrorResponse)([
            {
                field: 'body',
                message: 'Request body cannot be empty',
            },
        ]));
        return;
    }
    next();
};
exports.validateBody = validateBody;
/**
 * Middleware: Validate required fields in body
 *
 * Ensures all required fields are present in request body.
 *
 * Usage: router.post('/items', validateRequired(['name', 'email']), handler)
 *
 * @param requiredFields - Array of required field names
 * @returns Middleware function
 */
const validateRequired = (requiredFields) => {
    return (req, res, next) => {
        const errors = [];
        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === null) {
                errors.push({
                    field,
                    message: `${field} is required`,
                });
            }
            if (typeof req.body[field] === 'string' && req.body[field].trim().length === 0) {
                errors.push({
                    field,
                    message: `${field} cannot be empty`,
                });
            }
        }
        if (errors.length > 0) {
            res.status(400).json((0, exports.createValidationErrorResponse)(errors));
            return;
        }
        next();
    };
};
exports.validateRequired = validateRequired;
/**
 * Middleware: Validate email field
 *
 * Usage: router.post('/users', validateEmailField('email'), handler)
 *
 * @param fieldName - Name of email field
 * @returns Middleware function
 */
const validateEmailField = (fieldName = 'email') => {
    return (req, res, next) => {
        const email = req.body[fieldName];
        if (!email || !(0, exports.isValidEmail)(email)) {
            res.status(400).json((0, exports.createValidationErrorResponse)([
                {
                    field: fieldName,
                    message: 'Invalid email format',
                    value: email,
                },
            ]));
            return;
        }
        // Normalize email to lowercase
        req.body[fieldName] = email.toLowerCase().trim();
        next();
    };
};
exports.validateEmailField = validateEmailField;
/**
 * Middleware: Validate password field
 *
 * Usage: router.post('/register', validatePasswordField('password'), handler)
 *
 * @param fieldName - Name of password field
 * @returns Middleware function
 */
const validatePasswordField = (fieldName = 'password') => {
    return (req, res, next) => {
        const password = req.body[fieldName];
        if (!password) {
            res.status(400).json((0, exports.createValidationErrorResponse)([
                {
                    field: fieldName,
                    message: 'Password is required',
                },
            ]));
            return;
        }
        const validation = (0, exports.validatePassword)(password);
        if (!validation.isValid) {
            res.status(400).json((0, exports.createValidationErrorResponse)([
                {
                    field: fieldName,
                    message: validation.feedback.join('; '),
                },
            ]));
            return;
        }
        next();
    };
};
exports.validatePasswordField = validatePasswordField;
/**
 * Middleware: Sanitize string fields
 *
 * Trims whitespace and removes potentially dangerous characters.
 *
 * Usage: router.post('/users', sanitizeFields(['name', 'email']), handler)
 *
 * @param fields - Array of field names to sanitize
 * @returns Middleware function
 */
const sanitizeFields = (fields) => {
    return (req, _res, next) => {
        for (const field of fields) {
            if (typeof req.body[field] === 'string') {
                // Trim whitespace
                req.body[field] = req.body[field].trim();
                // Remove HTML tags (basic protection)
                req.body[field] = req.body[field].replace(/<[^>]*>/g, '');
            }
        }
        next();
    };
};
exports.sanitizeFields = sanitizeFields;
/**
 * Middleware: validateRequest
 * Validates the Express request body against a Zod schema.
 * Throws ZodError to the global errorHandler if validation fails.
 */
const validateRequest = (schema) => {
    return async (req, _res, next) => {
        try {
            // Validate and cast the request body
            req.body = await schema.parseAsync(req.body);
            return next();
        }
        catch (error) {
            // Pass the ZodError down to the error handler middleware
            return next(error);
        }
    };
};
exports.validateRequest = validateRequest;
