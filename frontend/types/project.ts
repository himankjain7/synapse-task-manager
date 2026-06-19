export type ProjectStatus = 'active' | 'archived';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  dueDate: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  memberCount: number;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithAssignee extends Task {
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  labels: TaskLabel[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  dueDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  dueDate?: string | null;
  status?: ProjectStatus;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position?: number;
  labels?: string[];
}

export interface ReorderTaskInput {
  taskId: string;
  status: TaskStatus;
  position: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  dueDateBefore?: string;
  dueDateAfter?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface CreateCommentInput {
  content: string;
}

export interface CreateLabelInput {
  name: string;
  color: string;
}

export interface ActivityLogItem {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface TaskWithDetails extends TaskWithAssignee {
  estimatedHours: number | null;
  completedAt: string | null;
  workspaceId: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}
