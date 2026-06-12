"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
    description: zod_1.z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: zod_1.z.string().uuid('Invalid assignee User ID').nullable().optional(),
    dueDate: zod_1.z.string().datetime().nullable().optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title cannot be blank').max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: zod_1.z.string().uuid().nullable().optional(),
    dueDate: zod_1.z.string().datetime().nullable().optional(),
    position: zod_1.z.number().int('Position must be an integer').nonnegative().optional(),
});
