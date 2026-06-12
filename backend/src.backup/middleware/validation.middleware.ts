import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../models';

/**
 * Validation Error Response
 */
interface ValidationErrorResponse {
  code: string;
  message: string;
  errors: ValidationError[];
  timestamp: Date;
}

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
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

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
export const validatePassword = (
  password: string
): { isValid: boolean; feedback: string[] } => {
  const feedback: string[] = [];

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

/**
 * Validate UUID format
 *
 * @param id - ID to validate
 * @returns true if valid UUID v4
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate string length
 *
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns true if valid
 */
export const isValidLength = (
  value: string,
  min: number = 1,
  max: number = 255
): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max;
};

/**
 * Validate enum value
 *
 * @param value - Value to validate
 * @param enumValues - Allowed values
 * @returns true if value in enum
 */
export const isValidEnum = (value: string, enumValues: string[]): boolean => {
  return enumValues.includes(value);
};

/**
 * Validate date
 *
 * @param value - Date to validate
 * @param minDate - Minimum allowed date (optional)
 * @returns true if valid date
 */
export const isValidDate = (value: any, minDate?: Date): boolean => {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return false;
  }

  if (minDate && date < minDate) {
    return false;
  }

  return true;
};

/**
 * Validate color format
 *
 * Accepts hex colors (#RRGGBB or #RGB)
 *
 * @param color - Color string to validate
 * @returns true if valid hex color
 */
export const isValidColor = (color: string): boolean => {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return colorRegex.test(color);
};

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns true if valid URL
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate pagination parameters
 *
 * @param page - Page number
 * @param limit - Items per page
 * @returns true if valid pagination
 */
export const isValidPagination = (page: number, limit: number): boolean => {
  return page >= 1 && limit >= 1 && limit <= 100;
};

/**
 * Create validation error response
 *
 * @param errors - Array of validation errors
 * @returns Error response object
 */
export const createValidationErrorResponse = (
  errors: ValidationError[]
): ValidationErrorResponse => {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    errors,
    timestamp: new Date(),
  };
};

/**
 * Middleware: Validate UUID in route params
 *
 * Usage: router.get('/:id', validateUUID('id'), handler)
 *
 * @param paramName - Name of UUID param in route
 * @returns Middleware function
 */
export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!id || !isValidUUID(id)) {
      res.status(400).json(
        createValidationErrorResponse([
          {
            field: paramName,
            message: 'Invalid UUID format',
            value: id,
          },
        ])
      );
      return;
    }

    next();
  };
};

/**
 * Middleware: Validate pagination query params
 *
 * Ensures page and limit are valid numbers within acceptable range.
 *
 * Usage: router.get('/items', validatePagination, handler)
 *
 * @returns Middleware function
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!isValidPagination(page, limit)) {
    res.status(400).json(
      createValidationErrorResponse([
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
      ])
    );
    return;
  }

  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};

/**
 * Middleware: Validate JSON body exists
 *
 * Ensures request has JSON body with at least one property.
 *
 * Usage: router.post('/items', validateBody, handler)
 *
 * @returns Middleware function
 */
export const validateBody = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json(
      createValidationErrorResponse([
        {
          field: 'body',
          message: 'Request body cannot be empty',
        },
      ])
    );
    return;
  }

  next();
};

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
export const validateRequired = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];

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
      res.status(400).json(createValidationErrorResponse(errors));
      return;
    }

    next();
  };
};

/**
 * Middleware: Validate email field
 *
 * Usage: router.post('/users', validateEmailField('email'), handler)
 *
 * @param fieldName - Name of email field
 * @returns Middleware function
 */
export const validateEmailField = (fieldName: string = 'email') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const email = req.body[fieldName];

    if (!email || !isValidEmail(email)) {
      res.status(400).json(
        createValidationErrorResponse([
          {
            field: fieldName,
            message: 'Invalid email format',
            value: email,
          },
        ])
      );
      return;
    }

    // Normalize email to lowercase
    req.body[fieldName] = email.toLowerCase().trim();

    next();
  };
};

/**
 * Middleware: Validate password field
 *
 * Usage: router.post('/register', validatePasswordField('password'), handler)
 *
 * @param fieldName - Name of password field
 * @returns Middleware function
 */
export const validatePasswordField = (fieldName: string = 'password') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const password = req.body[fieldName];

    if (!password) {
      res.status(400).json(
        createValidationErrorResponse([
          {
            field: fieldName,
            message: 'Password is required',
          },
        ])
      );
      return;
    }

    const validation = validatePassword(password);

    if (!validation.isValid) {
      res.status(400).json(
        createValidationErrorResponse([
          {
            field: fieldName,
            message: validation.feedback.join('; '),
          },
        ])
      );
      return;
    }

    next();
  };
};

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
export const sanitizeFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
import { AnyZodObject } from 'zod';

/**
 * Middleware: validateRequest
 * Validates the Express request body against a Zod schema.
 * Throws ZodError to the global errorHandler if validation fails.
 */
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Validate and cast the request body
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      // Pass the ZodError down to the error handler middleware
      return next(error);
    }
  };
};
