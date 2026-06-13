import { z } from 'zod';

// Reusable standard query validation schemas
export const paginationQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid identifier format'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type QueryValidationResult<T> = 
  | { success: true; data: T } 
  | { success: false; errors: Record<string, string[]> };

// Helper to safely parse inputs
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): QueryValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string[]> = {};
  result.error.issues.forEach((err) => {
    const key = err.path.join('.') || 'root';
    if (!errors[key]) {
      errors[key] = [];
    }
    errors[key].push(err.message);
  });
  
  return { success: false, errors };
}

// Auth validation schemas (mirrors backend Zod schemas)
export const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type RegisterFormData = z.infer<typeof registerFormSchema>;
