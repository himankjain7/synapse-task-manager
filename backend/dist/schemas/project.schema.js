"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Project name must be at least 2 characters long'),
    description: zod_1.z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid 6-character hex code (e.g., #FFFFFF)').optional(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Project name must be at least 2 characters long').optional(),
    description: zod_1.z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid 6-character hex code').optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
});
