"use strict";
// ============================================================================
// TypeScript Models and Types
// ============================================================================
// Strict TypeScript interfaces for all domain entities, validation schemas,
// and error handling. All types are exported from this single index file.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.ActivityLogEntityType = exports.ActivityLogAction = exports.NotificationType = exports.WorkspaceMemberRole = exports.ProjectStatus = exports.TaskPriority = exports.TaskStatus = void 0;
// ============================================================================
// 1. ENUMS
// ============================================================================
/**
 * Task status enumeration
 */
/**
 * Task status enum (values from Prisma)
 */
exports.TaskStatus = {
    todo: 'todo',
    in_progress: 'in_progress',
    done: 'done',
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
};
/**
 * Task priority enum (values from Prisma)
 */
exports.TaskPriority = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};
/**
 * Project status enum (values from Prisma)
 */
exports.ProjectStatus = {
    active: 'active',
    archived: 'archived',
    on_hold: 'on_hold',
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    ON_HOLD: 'on_hold',
};
/**
 * Workspace member role enum (values from Prisma)
 */
exports.WorkspaceMemberRole = {
    owner: 'owner',
    admin: 'admin',
    member: 'member',
    guest: 'guest',
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    GUEST: 'guest',
};
/**
 * Notification type enumeration
 */
var NotificationType;
(function (NotificationType) {
    NotificationType["TASK_ASSIGNED"] = "task_assigned";
    NotificationType["TASK_COMPLETED"] = "task_completed";
    NotificationType["TASK_UPDATED"] = "task_updated";
    NotificationType["COMMENT_ADDED"] = "comment_added";
    NotificationType["WORKSPACE_INVITED"] = "workspace_invited";
    NotificationType["PROJECT_CREATED"] = "project_created";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * Activity log action enumeration
 */
var ActivityLogAction;
(function (ActivityLogAction) {
    ActivityLogAction["USER_CREATED"] = "user_created";
    ActivityLogAction["USER_UPDATED"] = "user_updated";
    ActivityLogAction["USER_DELETED"] = "user_deleted";
    ActivityLogAction["WORKSPACE_CREATED"] = "workspace_created";
    ActivityLogAction["WORKSPACE_UPDATED"] = "workspace_updated";
    ActivityLogAction["WORKSPACE_DELETED"] = "workspace_deleted";
    ActivityLogAction["PROJECT_CREATED"] = "project_created";
    ActivityLogAction["PROJECT_UPDATED"] = "project_updated";
    ActivityLogAction["PROJECT_ARCHIVED"] = "project_archived";
    ActivityLogAction["TASK_CREATED"] = "task_created";
    ActivityLogAction["TASK_UPDATED"] = "task_updated";
    ActivityLogAction["TASK_ASSIGNED"] = "task_assigned";
    ActivityLogAction["TASK_COMPLETED"] = "task_completed";
    ActivityLogAction["TASK_DELETED"] = "task_deleted";
    ActivityLogAction["COMMENT_CREATED"] = "comment_created";
    ActivityLogAction["COMMENT_UPDATED"] = "comment_updated";
    ActivityLogAction["COMMENT_DELETED"] = "comment_deleted";
    ActivityLogAction["MEMBER_ADDED"] = "member_added";
    ActivityLogAction["MEMBER_REMOVED"] = "member_removed";
    ActivityLogAction["MEMBER_ROLE_CHANGED"] = "member_role_changed";
})(ActivityLogAction || (exports.ActivityLogAction = ActivityLogAction = {}));
/**
 * Activity log entity type enumeration
 */
var ActivityLogEntityType;
(function (ActivityLogEntityType) {
    ActivityLogEntityType["USER"] = "user";
    ActivityLogEntityType["WORKSPACE"] = "workspace";
    ActivityLogEntityType["PROJECT"] = "project";
    ActivityLogEntityType["TASK"] = "task";
    ActivityLogEntityType["COMMENT"] = "comment";
    ActivityLogEntityType["MEMBER"] = "member";
})(ActivityLogEntityType || (exports.ActivityLogEntityType = ActivityLogEntityType = {}));
/**
 * Error code enumeration
 */
var ErrorCode;
(function (ErrorCode) {
    // Authentication errors (4xx)
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    // Validation errors (4xx)
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    // Resource errors (4xx)
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["DUPLICATE_EMAIL"] = "DUPLICATE_EMAIL";
    ErrorCode["DUPLICATE_NAME"] = "DUPLICATE_NAME";
    // Business logic errors (4xx)
    ErrorCode["INVALID_STATUS"] = "INVALID_STATUS";
    ErrorCode["INVALID_PRIORITY"] = "INVALID_PRIORITY";
    ErrorCode["INVALID_ROLE"] = "INVALID_ROLE";
    ErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ErrorCode["WORKSPACE_NOT_FOUND"] = "WORKSPACE_NOT_FOUND";
    ErrorCode["PROJECT_NOT_FOUND"] = "PROJECT_NOT_FOUND";
    ErrorCode["TASK_NOT_FOUND"] = "TASK_NOT_FOUND";
    ErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCode["COMMENT_NOT_FOUND"] = "COMMENT_NOT_FOUND";
    // Server errors (5xx)
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
