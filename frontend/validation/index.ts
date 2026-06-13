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
