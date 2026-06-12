import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters long'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid 6-character hex code (e.g., #FFFFFF)').optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters long').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid 6-character hex code').optional(),
  status: z.enum(['active', 'archived']).optional(),
});
