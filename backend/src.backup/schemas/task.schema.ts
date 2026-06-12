import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid('Invalid assignee User ID').nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be blank').max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  position: z.number().int('Position must be an integer').nonnegative().optional(),
});
