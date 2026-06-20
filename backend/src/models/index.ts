// ============================================================================
// TypeScript Models and Types
// ============================================================================
// Strict TypeScript interfaces for all domain entities, validation schemas,
// and error handling. All types are exported from this single index file.
// ============================================================================

// ============================================================================
// 1. ENUMS
// ============================================================================

/**
 * Task status enumeration
 */


/**
 * Task status enum (values from Prisma)
 */
export const TaskStatus = {
  backlog: 'backlog',
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'review',
  done: 'done',
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * Task priority enum (values from Prisma)
 */
export const TaskPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

/**
 * Project status enum (values from Prisma)
 */
export const ProjectStatus = {
  active: 'active',
  archived: 'archived',
  on_hold: 'on_hold',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  ON_HOLD: 'on_hold',
} as const;
export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

/**
 * Workspace member role enum (values from Prisma)
 */
export const WorkspaceMemberRole = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  guest: 'guest',
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;
export type WorkspaceMemberRole = typeof WorkspaceMemberRole[keyof typeof WorkspaceMemberRole];


/**
 * Notification type enumeration
 */
export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_COMPLETED = "task_completed",
  TASK_UPDATED = "task_updated",
  COMMENT_ADDED = "comment_added",
  WORKSPACE_INVITED = "workspace_invited",
  PROJECT_CREATED = "project_created",
}

/**
 * Activity log action enumeration
 */
export enum ActivityLogAction {
  USER_CREATED = "user_created",
  USER_UPDATED = "user_updated",
  USER_DELETED = "user_deleted",
  WORKSPACE_CREATED = "workspace_created",
  WORKSPACE_UPDATED = "workspace_updated",
  WORKSPACE_DELETED = "workspace_deleted",
  PROJECT_CREATED = "project_created",
  PROJECT_UPDATED = "project_updated",
  PROJECT_ARCHIVED = "project_archived",
  TASK_CREATED = "task_created",
  TASK_UPDATED = "task_updated",
  TASK_ASSIGNED = "task_assigned",
  TASK_COMPLETED = "task_completed",
  TASK_DELETED = "task_deleted",
  COMMENT_CREATED = "comment_created",
  COMMENT_UPDATED = "comment_updated",
  COMMENT_DELETED = "comment_deleted",
  MEMBER_ADDED = "member_added",
  MEMBER_REMOVED = "member_removed",
  MEMBER_ROLE_CHANGED = "member_role_changed",
}

/**
 * Activity log entity type enumeration
 */
export enum ActivityLogEntityType {
  USER = "user",
  WORKSPACE = "workspace",
  PROJECT = "project",
  TASK = "task",
  COMMENT = "comment",
  MEMBER = "member",
}

/**
 * Error code enumeration
 */
export enum ErrorCode {
  // Authentication errors (4xx)
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Validation errors (4xx)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource errors (4xx)
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  DUPLICATE_NAME = "DUPLICATE_NAME",

  // Business logic errors (4xx)
  INVALID_STATUS = "INVALID_STATUS",
  INVALID_PRIORITY = "INVALID_PRIORITY",
  INVALID_ROLE = "INVALID_ROLE",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND",
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND",

  // Server errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

// ============================================================================
// 2. CORE ENTITY INTERFACES
// ============================================================================

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl: string | null;
  googleId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * User response interface (excludes sensitive data)
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workspace entity interface
 */
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Workspace with owner details
 */
export interface WorkspaceWithOwner extends Workspace {
  owner: UserResponse;
}

/**
 * Workspace member entity interface
 */
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  joinedAt: Date;
  updatedAt?: Date;
}

/**
 * Workspace member with user details
 */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: UserResponse;
}

/**
 * Project entity interface
 */
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Project with owner details
 */
export interface ProjectWithOwner extends Project {
  owner: UserResponse | null;
}

/**
 * Task entity interface
 */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Task with assignee details
 */
export interface TaskWithAssignee extends Task {
  assignee: UserResponse | null;
}

/**
 * Task with full details (assignee + project)
 */
export interface TaskWithDetails extends TaskWithAssignee {
  project: Project;

  labels?: {
    id: string;
    name: string;
    color: string;
  }[];
}

/**
 * Comment entity interface
 */
export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Comment with user details
 */
export interface CommentWithUser extends Comment {
  user: UserResponse;
}

/**
 * Notification entity interface
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Activity log entity interface
 */
export interface ActivityLog {
  id: string;
  workspaceId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Activity log with user details
 */
export interface ActivityLogWithUser extends ActivityLog {
  user: UserResponse;
}

// ============================================================================
// 3. REQUEST/RESPONSE VALIDATION TYPES
// ============================================================================

/**
 * User creation validation
 */
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  avatarUrl?: string;
}

/**
 * User validation with all optional fields for updates
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
}

/**
 * Workspace creation validation
 */
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

/**
 * Workspace update validation
 */
export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
}

/**
 * Workspace member addition validation
 */
export interface AddWorkspaceMemberRequest {
  userId: string;
  role: WorkspaceMemberRole;
}

/**
 * Workspace member role update validation
 */
export interface UpdateWorkspaceMemberRequest {
  role: WorkspaceMemberRole;
}

/**
 * Project creation validation
 */
export interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
}

/**
 * Project update validation
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
}

/**
 * Task creation validation
 */
export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: Date;
}

/**
 * Task update validation
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: Date | null;
}

/**
 * Task bulk update validation
 */
export interface BulkUpdateTaskRequest {
  taskIds: string[];
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
}

/**
 * Comment creation validation
 */
export interface CreateCommentRequest {
  taskId: string;
  content: string;
}

/**
 * Comment update validation
 */
export interface UpdateCommentRequest {
  content: string;
}

/**
 * Notification creation validation
 */
export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification update (mark as read)
 */
export interface UpdateNotificationRequest {
  read: boolean;
}

/**
 * Activity log creation validation
 */
export interface CreateActivityLogRequest {
  workspaceId: string;
  userId: string;
  action: ActivityLogAction;
  entityType: ActivityLogEntityType;
  entityId?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// 4. PAGINATION AND QUERY TYPES
// ============================================================================

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Sorted query parameters
 */
export interface SortQuery {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationQuery, SortQuery {
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
}

/**
 * Filter parameters for tasks
 */
export interface TaskFilterParams extends QueryParams {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: { from?: Date; to?: Date };
}

/**
 * Filter parameters for activity logs
 */
export interface ActivityLogFilterParams extends QueryParams {
  workspaceId: string;
  userId?: string;
  action?: ActivityLogAction;
  entityType?: ActivityLogEntityType;
  dateRange?: { from?: Date; to?: Date };
}

// ============================================================================
// 5. ERROR RESPONSE TYPES
// ============================================================================

/**
 * Standard error response
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ErrorResponse {
  errors: ValidationError[];
}

/**
 * Authentication error response
 */
export interface AuthErrorResponse extends ErrorResponse {
  code:
    | ErrorCode.UNAUTHORIZED
    | ErrorCode.INVALID_TOKEN
    | ErrorCode.TOKEN_EXPIRED;
}

/**
 * Not found error response
 */
export interface NotFoundErrorResponse extends ErrorResponse {
  code: ErrorCode.NOT_FOUND;
  resource: string;
  resourceId: string;
}

// ============================================================================
// 6. SUCCESS RESPONSE TYPES
// ============================================================================

/**
 * Generic success response
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
}

/**
 * List response with pagination
 */
export interface ListResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: Date;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: true;
  data: {
    successful: number;
    failed: number;
    errors?: Array<{
      id: string;
      error: string;
    }>;
  };
  timestamp: Date;
}

// ============================================================================
// 7. AUTHENTICATION TYPES
// ============================================================================

/**
 * Login request validation
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response with token
 */
export interface LoginResponse {
  user: UserResponse;
  token: string;
  expiresIn: number;
}

/**
 * Google OAuth login request
 */
export interface GoogleLoginRequest {
  idToken: string;
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authenticated request context
 */
export interface AuthContext {
  userId: string;
  email: string;
  workspace?: string;
  role?: WorkspaceMemberRole;
}

// ============================================================================
// 8. UTILITY TYPES
// ============================================================================

// Use built-in TypeScript utility types instead of redefining them here.
// For nullable/optional semantics use `T | null` or `T | undefined` inline where needed.

// ============================================================================
// 9. EXPORT CONVENIENCE TYPES
// ============================================================================

/**
 * All entity types
 */
export type Entity =
  | User
  | Workspace
  | WorkspaceMember
  | Project
  | Task
  | Comment
  | Notification
  | ActivityLog;

/**
 * All request types
 */
export type CreateRequest =
  | CreateUserRequest
  | CreateWorkspaceRequest
  | CreateProjectRequest
  | CreateTaskRequest
  | CreateCommentRequest;

/**
 * All response types
 */
export type EntityResponse =
  | UserResponse
  | WorkspaceWithOwner
  | ProjectWithOwner
  | TaskWithDetails
  | CommentWithUser
  | Notification
  | ActivityLogWithUser;

/**
 * All filter parameters
 */
export type FilterParams = TaskFilterParams | ActivityLogFilterParams | QueryParams;
