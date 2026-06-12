import { getIo, broadcast } from '../index';
import prisma from '../../config/db';

// Types for payloads
export interface UserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface TaskCreatedPayload {
  task: any;
  createdBy: UserSummary;
}

export interface TaskUpdatedPayload {
  taskId: string;
  changes: Record<string, any>;
  updatedBy: UserSummary;
  updatedAt: string;
}

export interface TaskAssignedPayload {
  taskId: string;
  assignedTo: UserSummary;
  assignedBy: UserSummary;
  assignedAt: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: UserSummary;
}

export interface TaskDeletedPayload {
  taskId: string;
  deletedBy: UserSummary;
}

export interface CommentAddedPayload {
  taskId: string;
  comment: any;
  author: UserSummary;
}

/**
 * Helper: write an activity log entry and return created record
 */
async function writeActivityLog(workspaceId: string, userId: string, action: string, details: any) {
  try {
    const entry = await prisma.activityLog.create({
      data: {
        workspaceId,
        userId,
        action,
        details,
      },
    });
    return entry;
  } catch (err) {
    // Log but don't fail the emit
    console.error('[ActivityLog] failed to write', err);
    return null;
  }
}

/**
 * Emit `task:created` to project and workspace rooms.
 * - Broadcasts to `project:{projectId}` and `workspace:{workspaceId}`
 * - Persists an activity log entry
 */
export async function emitTaskCreated(projectId: string, workspaceId: string, payload: TaskCreatedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  // Broadcast to rooms
  broadcast(roomProject, 'task:created', payload);
  if (workspaceId) broadcast(roomWorkspace, 'task:created', payload);

  // Persist activity
  await writeActivityLog(workspaceId, payload.createdBy.id, 'task.created', {
    taskId: payload.task.id,
    title: payload.task.title,
  });
}

/**
 * Emit `task:updated` with change delta and updated timestamp
 */
export async function emitTaskUpdated(projectId: string, workspaceId: string, payload: TaskUpdatedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  broadcast(roomProject, 'task:updated', payload);
  if (workspaceId) broadcast(roomWorkspace, 'task:updated', payload);

  await writeActivityLog(workspaceId, payload.updatedBy.id, 'task.updated', {
    taskId: payload.taskId,
    changes: payload.changes,
    updatedAt: payload.updatedAt,
  });
}

/**
 * Emit `task:assigned` when assignee changes
 */
export async function emitTaskAssigned(projectId: string, workspaceId: string, payload: TaskAssignedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  broadcast(roomProject, 'task:assigned', payload);
  if (workspaceId) broadcast(roomWorkspace, 'task:assigned', payload);

  await writeActivityLog(workspaceId, payload.assignedBy.id, 'task.assigned', {
    taskId: payload.taskId,
    assignedTo: payload.assignedTo.id,
    assignedAt: payload.assignedAt,
  });
}

/**
 * Emit `task:statusChanged` when status changes
 */
export async function emitTaskStatusChanged(projectId: string, workspaceId: string, payload: TaskStatusChangedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  broadcast(roomProject, 'task:statusChanged', payload);
  if (workspaceId) broadcast(roomWorkspace, 'task:statusChanged', payload);

  await writeActivityLog(workspaceId, payload.changedBy.id, 'task.status_changed', {
    taskId: payload.taskId,
    from: payload.oldStatus,
    to: payload.newStatus,
  });
}

/**
 * Emit `task:deleted` when a task is removed
 */
export async function emitTaskDeleted(projectId: string, workspaceId: string, payload: TaskDeletedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  broadcast(roomProject, 'task:deleted', payload);
  if (workspaceId) broadcast(roomWorkspace, 'task:deleted', payload);

  await writeActivityLog(workspaceId, payload.deletedBy.id, 'task.deleted', {
    taskId: payload.taskId,
  });
}

/**
 * Emit `comment:added` when a comment is posted on a task. Emits to task's project and workspace.
 */
export async function emitCommentAdded(projectId: string, workspaceId: string, payload: CommentAddedPayload) {
  const roomProject = `project:${projectId}`;
  const roomWorkspace = `workspace:${workspaceId}`;

  broadcast(roomProject, 'comment:added', payload);
  if (workspaceId) broadcast(roomWorkspace, 'comment:added', payload);

  await writeActivityLog(workspaceId, payload.author.id, 'comment.added', {
    taskId: payload.taskId,
    commentId: payload.comment.id,
    text: payload.comment.content?.slice(0, 240) || null,
  });
}

/**
 * Convenience: return the io instance for direct emits (if needed).
 */
export function ioInstance() {
  try {
    return getIo();
  } catch (err) {
    return null;
  }
}

export default {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskAssigned,
  emitTaskStatusChanged,
  emitTaskDeleted,
  emitCommentAdded,
  ioInstance,
};
