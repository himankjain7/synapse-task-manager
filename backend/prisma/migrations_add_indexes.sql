-- CreateIndex (Workspace: workspace owner listing)
CREATE INDEX IF NOT EXISTS "workspaces_owner_id_deleted_at_idx" ON "workspaces"("owner_id", "deleted_at");

-- CreateIndex (WorkspaceMember: find all memberships for a user)
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex (Project: project owner listing)
CREATE INDEX IF NOT EXISTS "projects_owner_id_deleted_at_idx" ON "projects"("owner_id", "deleted_at");

-- CreateIndex (Project: workspace project listing with status filter + createdAt sort)
CREATE INDEX IF NOT EXISTS "projects_workspace_id_status_created_at_idx" ON "projects"("workspace_id", "status", "created_at");

-- CreateIndex (Project: workspace project listing with deletedAt filter)
CREATE INDEX IF NOT EXISTS "projects_workspace_id_deleted_at_idx" ON "projects"("workspace_id", "deleted_at");

-- CreateIndex (Task: project task listing by creation date)
CREATE INDEX IF NOT EXISTS "tasks_project_id_created_at_deleted_at_idx" ON "tasks"("project_id", "created_at", "deleted_at");

-- CreateIndex (Task: kanban ordering by position)
CREATE INDEX IF NOT EXISTS "tasks_project_id_position_deleted_at_idx" ON "tasks"("project_id", "position", "deleted_at");

-- CreateIndex (Task: project task listing with deletedAt filter)
CREATE INDEX IF NOT EXISTS "tasks_project_id_deleted_at_idx" ON "tasks"("project_id", "deleted_at");

-- CreateIndex (Task: status groupBy queries)
CREATE INDEX IF NOT EXISTS "tasks_project_id_status_deleted_at_idx" ON "tasks"("project_id", "status", "deleted_at");

-- CreateIndex (Task: completion trends & todayCompleted analytics)
CREATE INDEX IF NOT EXISTS "tasks_project_id_completed_at_deleted_at_idx" ON "tasks"("project_id", "completed_at", "deleted_at");

-- CreateIndex (Task: overdue queries)
CREATE INDEX IF NOT EXISTS "tasks_project_id_due_date_status_deleted_at_idx" ON "tasks"("project_id", "due_date", "status", "deleted_at");

-- CreateIndex (Task: priority groupBy queries)
CREATE INDEX IF NOT EXISTS "tasks_project_id_priority_deleted_at_idx" ON "tasks"("project_id", "priority", "deleted_at");

-- CreateIndex (Task: assigned task listing)
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_deleted_at_idx" ON "tasks"("assigned_to", "deleted_at");

-- CreateIndex (Task: assigned task analytics)
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_status_completed_at_deleted_at_idx" ON "tasks"("assigned_to", "status", "completed_at", "deleted_at");

-- CreateIndex (Task: cross-project overdue queries)
CREATE INDEX IF NOT EXISTS "tasks_due_date_status_deleted_at_idx" ON "tasks"("due_date", "status", "deleted_at");

-- CreateIndex (Subtask: list subtasks ordered by position)
CREATE INDEX IF NOT EXISTS "subtasks_task_id_position_idx" ON "subtasks"("task_id", "position");

-- CreateIndex (Comment: load top-level comments for a task ordered by createdAt)
CREATE INDEX IF NOT EXISTS "comments_task_id_parent_id_created_at_idx" ON "comments"("task_id", "parent_id", "created_at");

-- CreateIndex (Comment: load replies to a comment)
CREATE INDEX IF NOT EXISTS "comments_parent_id_created_at_idx" ON "comments"("parent_id", "created_at");

-- CreateIndex (Comment: user's recent comments)
CREATE INDEX IF NOT EXISTS "comments_user_id_created_at_idx" ON "comments"("user_id", "created_at");

-- CreateIndex (TaskLabelAssignment: delete all assignments for a label)
CREATE INDEX IF NOT EXISTS "task_label_assignments_label_id_idx" ON "task_label_assignments"("label_id");

-- CreateIndex (Attachment: list attachments for a task ordered by recency)
CREATE INDEX IF NOT EXISTS "attachments_task_id_created_at_idx" ON "attachments"("task_id", "created_at");

-- CreateIndex (Notification: unread notification listing for a user)
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_created_at_idx" ON "notifications"("user_id", "read", "created_at");

-- CreateIndex (ActivityLog: activity feed for a task)
CREATE INDEX IF NOT EXISTS "activity_logs_task_id_created_at_idx" ON "activity_logs"("task_id", "created_at");

-- CreateIndex (ActivityLog: activity by a user)
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");

-- CreateIndex (ActivityLog: workspace activity feed)
CREATE INDEX IF NOT EXISTS "activity_logs_workspace_id_created_at_idx" ON "activity_logs"("workspace_id", "created_at");
