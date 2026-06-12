import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters long'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters long').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});
