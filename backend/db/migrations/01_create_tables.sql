-- =========================================================================
-- DATABASE MIGRATION: 01_create_tables.sql
-- PROJECT: Synapse Collaborative Task Management Platform
-- DESIGN LEVEL: Production-Grade, Optimized
-- =========================================================================

-- Enable UUID extension for generating UUID v4 keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- ENUM TYPES DEFINITIONS
-- Why: Enums ensure strong data typing and integrity at the database layer.
-- Tradeoff: Changing enum values in PostgreSQL requires ALTER TYPE commands, 
-- but it provides solid constraint verification over simple VARCHAR checks.
-- =========================================================================
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- =========================================================================
-- TRIGGER FUNCTION FOR AUTOMATIC updated_at UPDATE
-- Why: In PostgreSQL, DEFAULT CURRENT_TIMESTAMP only applies on INSERT. 
-- Adding a trigger automates updated_at management, preventing application-level drifts.
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 1. USERS TABLE
-- =========================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(2048) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Attach update trigger to users
CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================================
-- 2. WORKSPACES TABLE
-- =========================================================================
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    -- ON DELETE RESTRICT prevents users from deleting their accounts while owning workspaces.
    -- They must transfer ownership or explicitly delete the workspaces first.
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Attach update trigger to workspaces
CREATE TRIGGER trigger_update_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================================
-- 2b. WORKSPACE MEMBERS TABLE
-- =========================================================================
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member', 'guest');

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role workspace_member_role DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (workspace_id, user_id)
);

-- Attach update trigger to workspace_members
CREATE TRIGGER trigger_update_workspace_members_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();



-- =========================================================================
-- 3. PROJECTS TABLE
-- =========================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ON DELETE CASCADE: Deleting a workspace cleans up all its projects.
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    color VARCHAR(7) DEFAULT '#6366F1' NOT NULL, -- Defaults to Indigo hex
    owner_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- =========================================================================
-- 4. TASKS TABLE
-- =========================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ON DELETE CASCADE: Deleting a project cleans up all tasks associated with it.
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    status task_status DEFAULT 'todo' NOT NULL,
    priority task_priority DEFAULT 'medium' NOT NULL,
    -- ON DELETE SET NULL: If a user is deleted, their tasks remain but become unassigned.
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Attach update trigger to tasks
CREATE TRIGGER trigger_update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================================
-- 5. COMMENTS TABLE
-- =========================================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ON DELETE CASCADE: Comments are children of tasks; deleting a task removes all comments.
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: If a user account is deleted, their comments are deleted as well.
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Attach update trigger to comments
CREATE TRIGGER trigger_update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- Why: Indexing avoids full-table scans. Important for high-volume endpoints.
-- =========================================================================

-- Index user searches & joins (Comments and assignees)
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- Index foreign keys for sub-routing (e.g. GET /projects/:projectId/tasks)
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);

-- Index workspace hierarchies (e.g. GET /workspaces/:workspaceId/projects)
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);

-- Composite Index for listing projects in a workspace ordered by creation date.
-- Postgres can scan this index directly to return sorted lists without a separate sort phase.
CREATE INDEX idx_projects_workspace_created ON projects(workspace_id, created_at DESC);
