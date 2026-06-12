"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkspaceSchema = exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Workspace name must be at least 2 characters long'),
    description: zod_1.z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});
exports.updateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Workspace name must be at least 2 characters long').optional(),
    description: zod_1.z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});
