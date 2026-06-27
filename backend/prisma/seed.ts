import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function uuid(): string {
  return crypto.randomUUID();
}

function daysAgo(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(Math.floor(Math.random() * 8) + 8, Math.floor(Math.random() * 60));
  return date;
}

function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date;
}

function randomBetween(start: Date, end: Date): Date {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomStatus(weights: { [K in TaskStatus]?: number } = {}): TaskStatus {
  const w = { backlog: 2, todo: 12, in_progress: 25, review: 5, done: 56, ...weights };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [status, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return status as TaskStatus;
  }
  return 'todo';
}

function randomPriority(weights: { [K in TaskPriority]?: number } = {}): TaskPriority {
  const w = { low: 15, medium: 35, high: 35, urgent: 15, ...weights };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [p, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return p as TaskPriority;
  }
  return 'medium';
}

async function main() {
  console.log('🌱 Seeding Synapse Workspace database...\n');

  const passwordHash = await bcrypt.hash('password123', 10);
  const NOW = new Date();

  // ============================================================
  // 1. USERS (6)
  // ============================================================
  const userDefs = [
    { id: uuid(), email: 'himank@synapse.dev', name: 'Himank Jain', avatarUrl: null },
    { id: uuid(), email: 'alex@synapse.dev', name: 'Alex Chen', avatarUrl: null },
    { id: uuid(), email: 'sarah@synapse.dev', name: 'Sarah Wilson', avatarUrl: null },
    { id: uuid(), email: 'emma@synapse.dev', name: 'Emma Brown', avatarUrl: null },
    { id: uuid(), email: 'david@synapse.dev', name: 'David Kim', avatarUrl: null },
    { id: uuid(), email: 'michael@synapse.dev', name: 'Michael Scott', avatarUrl: null },
  ];

  await prisma.user.createMany({
    data: userDefs.map((u) => ({
      ...u,
      passwordHash,
      createdAt: daysAgo(60 + Math.floor(Math.random() * 30)),
      updatedAt: daysAgo(Math.floor(Math.random() * 5)),
    })),
  });

  const [himank, alex, sarah, emma, david, michael] = userDefs;
  console.log(`  ✅ ${userDefs.length} users created`);

  // ============================================================
  // 2. WORKSPACES (3)
  // ============================================================
  const wsDefs = [
    { id: uuid(), name: 'Synapse Development', description: 'Core platform development for Synapse Workspace — task management, real-time collaboration, and analytics.', ownerId: himank.id },
    { id: uuid(), name: 'Mobile Team', description: 'React Native mobile application with offline support, push notifications, and biometric auth.', ownerId: himank.id },
    { id: uuid(), name: 'Internship Portfolio', description: 'Personal portfolio project showcasing full-stack development, design systems, and deployment pipelines.', ownerId: himank.id },
  ];

  await prisma.workspace.createMany({
    data: wsDefs.map((w) => ({
      ...w,
      createdAt: daysAgo(45 + Math.floor(Math.random() * 15)),
      updatedAt: daysAgo(Math.floor(Math.random() * 7)),
    })),
  });

  const [synapseWs, mobileWs, portfolioWs] = wsDefs;
  console.log(`  ✅ ${wsDefs.length} workspaces created`);

  // ============================================================
  // 3. WORKSPACE MEMBERS
  // ============================================================
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: synapseWs.id, userId: himank.id, role: 'owner', joinedAt: daysAgo(45) },
      { workspaceId: synapseWs.id, userId: alex.id, role: 'member', joinedAt: daysAgo(40) },
      { workspaceId: synapseWs.id, userId: sarah.id, role: 'member', joinedAt: daysAgo(38) },
      { workspaceId: synapseWs.id, userId: emma.id, role: 'member', joinedAt: daysAgo(42) },
      { workspaceId: synapseWs.id, userId: david.id, role: 'member', joinedAt: daysAgo(35) },
      { workspaceId: synapseWs.id, userId: michael.id, role: 'admin', joinedAt: daysAgo(30) },
      { workspaceId: mobileWs.id, userId: himank.id, role: 'owner', joinedAt: daysAgo(30) },
      { workspaceId: mobileWs.id, userId: alex.id, role: 'member', joinedAt: daysAgo(28) },
      { workspaceId: mobileWs.id, userId: sarah.id, role: 'member', joinedAt: daysAgo(26) },
      { workspaceId: mobileWs.id, userId: emma.id, role: 'member', joinedAt: daysAgo(24) },
      { workspaceId: mobileWs.id, userId: david.id, role: 'member', joinedAt: daysAgo(22) },
      { workspaceId: portfolioWs.id, userId: himank.id, role: 'owner', joinedAt: daysAgo(20) },
      { workspaceId: portfolioWs.id, userId: emma.id, role: 'member', joinedAt: daysAgo(18) },
      { workspaceId: portfolioWs.id, userId: alex.id, role: 'member', joinedAt: daysAgo(15) },
    ],
  });
  console.log('  ✅ Workspace members created');

  // ============================================================
  // 4. PROJECTS (14)
  // ============================================================
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1', '#84CC16', '#D946EF', '#0EA5E9', '#22C55E'];

  const projectDefs = [
    { id: uuid(), workspaceId: synapseWs.id, name: 'Authentication', description: 'User auth system with OAuth2, JWT, SSO, and role-based access control.', color: colors[0], ownerId: himank.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Dashboard', description: 'Workspace analytics dashboard with KPIs, charts, activity feeds, and export.', color: colors[1], ownerId: himank.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Realtime Collaboration', description: 'WebSocket infrastructure for real-time updates, presence, and collaborative editing.', color: colors[2], ownerId: alex.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Task Management', description: 'Core task CRUD, Kanban boards, subtasks, labels, comments, and activity timeline.', color: colors[3], ownerId: himank.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Analytics', description: 'Data aggregation, burndown charts, velocity tracking, and productivity reports.', color: colors[4], ownerId: michael.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Notifications', description: 'In-app, email, and push notification system with preferences and grouping.', color: colors[5], ownerId: sarah.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Performance', description: 'Query optimization, caching, lazy loading, pagination, and monitoring.', color: colors[6], ownerId: sarah.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Deployment', description: 'CI/CD pipeline, Docker, staging, migration automation, and rollback strategy.', color: colors[7], ownerId: alex.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Documentation', description: 'API docs, onboarding guides, architecture decisions, and testing standards.', color: colors[8], ownerId: emma.id },
    { id: uuid(), workspaceId: synapseWs.id, name: 'Design System', description: 'Component library with color tokens, typography, and reusable UI primitives.', color: colors[9], ownerId: emma.id },
    { id: uuid(), workspaceId: mobileWs.id, name: 'Mobile App', description: 'React Native mobile application with offline-first architecture and native features.', color: colors[10], ownerId: alex.id },
    { id: uuid(), workspaceId: portfolioWs.id, name: 'Portfolio Website', description: 'Personal portfolio with project showcase, blog, and contact form.', color: colors[11], ownerId: himank.id },
    { id: uuid(), workspaceId: portfolioWs.id, name: 'Blog Engine', description: 'CMS-powered blog with markdown support, tags, and RSS feed.', color: colors[12], ownerId: himank.id },
    { id: uuid(), workspaceId: portfolioWs.id, name: 'Resume Builder', description: 'Dynamic resume generator with export to PDF and multiple themes.', color: colors[13], ownerId: himank.id },
  ];

  await prisma.project.createMany({
    data: projectDefs.map((p) => ({
      ...p,
      createdAt: daysAgo(30 + Math.floor(Math.random() * 15)),
      deletedAt: null,
    })),
  });

  const projects = projectDefs;
  console.log(`  ✅ ${projects.length} projects created`);

  // ============================================================
  // 5. LABELS (per project)
  // ============================================================
  const labelNames = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#6366F1' },
    { name: 'Frontend', color: '#0EA5E9' },
    { name: 'Backend', color: '#8B5CF6' },
    { name: 'Database', color: '#F59E0B' },
    { name: 'Performance', color: '#10B981' },
    { name: 'UX', color: '#EC4899' },
    { name: 'API', color: '#14B8A6' },
    { name: 'Documentation', color: '#64748B' },
    { name: 'Research', color: '#F97316' },
    { name: 'High Priority', color: '#DC2626' },
    { name: 'Security', color: '#059669' },
  ];

  const allLabels: { id: string; projectId: string; name: string; color: string }[] = [];
  for (const project of projects) {
    for (const ln of labelNames) {
      allLabels.push({ id: uuid(), projectId: project.id, ...ln });
    }
  }

  await prisma.taskLabel.createMany({ data: allLabels });
  console.log(`  ✅ ${allLabels.length} labels created`);

  // ============================================================
  // 6. TASKS (130 total)
  // ============================================================
  type TaskSeed = {
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: string | null;
    dueDate: Date;
    createdAt: Date;
    completedAt: Date | null;
  };

  const taskDefs: { projectIdx: number; title: string; desc: string; status?: TaskStatus; priority?: TaskPriority; assigneeIdx?: number }[] = [
    // --- Authentication (12 tasks) ---
    { projectIdx: 0, title: 'Implement OAuth2 authentication flow', desc: 'Build the complete OAuth2 authorization code flow with support for Google, GitHub, and custom providers. Include token exchange, refresh, and revocation.' },
    { projectIdx: 0, title: 'Build login and registration page UI', desc: 'Design and implement responsive login and registration forms with form validation, error states, loading indicators, and social login buttons.' },
    { projectIdx: 0, title: 'Add Google SSO integration', desc: 'Integrate Google Identity Services for one-click sign-in. Handle token verification on the backend with google-auth-library.' },
    { projectIdx: 0, title: 'Implement JWT token refresh mechanism', desc: 'Add refresh token rotation with secure HTTP-only cookies. Implement token blacklisting on logout and password change.' },
    { projectIdx: 0, title: 'Design password reset flow', desc: 'Create email-based password reset with time-limited tokens. Include confirmation page, new password validation, and success notification.' },
    { projectIdx: 0, title: 'Add two-factor authentication setup', desc: 'Implement TOTP-based 2FA using authenticator apps. Add backup codes, QR code enrollment, and recovery flow.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 0, title: 'Implement role-based authorization middleware', desc: 'Create Express middleware for role-based access control. Support workspace-level roles (owner, admin, member, guest) with granular permission checks.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 0, title: 'Create user registration with email verification', desc: 'Build registration endpoint that sends verification email with confirmation link. Add resend verification and rate limiting.', status: 'done', assigneeIdx: 3 },
    { projectIdx: 0, title: 'Add session management and expiry handling', desc: 'Implement session tracking with device info, IP logging, and concurrent session limits. Add force logout from other devices.' },
    { projectIdx: 0, title: 'Build admin user management dashboard', desc: 'Create admin panel for user management with search, filtering, role assignment, account suspension, and activity audit log.', status: 'todo', priority: 'low', assigneeIdx: 4 },
    { projectIdx: 0, title: 'Add security headers and CSRF protection', desc: 'Configure Helmet.js for security headers. Implement double-submit cookie pattern for CSRF protection on state-changing requests.', status: 'done', assigneeIdx: 2 },
    { projectIdx: 0, title: 'Implement rate limiting for auth endpoints', desc: 'Add tiered rate limiting: strict limits on login/register endpoints, moderate on password reset. Use in-memory store with Redis fallback.', status: 'done', assigneeIdx: 1 },

    // --- Dashboard (10 tasks) ---
    { projectIdx: 1, title: 'Design dashboard wireframes and mockups', desc: 'Create Figma wireframes for the workspace dashboard including KPI cards, activity feed, progress rings, and chart layouts.', assigneeIdx: 3 },
    { projectIdx: 1, title: 'Build KPI metric cards component', desc: 'Create animated KPI cards with count-up animations, trend indicators, and configurable time ranges. Support dark mode.', assigneeIdx: 1 },
    { projectIdx: 1, title: 'Implement real-time activity feed', desc: 'Build a live-updating activity feed using Socket.io events. Show task creations, completions, comments, and assignments with avatars.', assigneeIdx: 1 },
    { projectIdx: 1, title: 'Create bar chart visualization component', desc: 'Build a custom bar chart component using Animated API. Support stacked bars, grouped bars, and horizontal layout with labels.', assigneeIdx: 1 },
    { projectIdx: 1, title: 'Add progress ring component', desc: 'Create an animated SVG progress ring showing task completion rates. Support multiple segments and gradient colors.', assigneeIdx: 3 },
    { projectIdx: 1, title: 'Implement workspace switching', desc: 'Add workspace selector dropdown with recent workspaces, search, and creation flow. Animate workspace transition with fade.' },
    { projectIdx: 1, title: 'Add dashboard data export (CSV/PDF)', desc: 'Build export service that generates CSV and PDF reports from dashboard data. Include date range selection and metric picker.', status: 'in_progress', priority: 'low', assigneeIdx: 2 },
    { projectIdx: 1, title: 'Build customizable widget layout', desc: 'Create a grid-based widget system with drag-to-reorder, resize, and per-widget settings. Persist layout per user.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 1, title: 'Add dark mode toggle with persistence', desc: 'Implement theme toggle with system preference detection, manual override, and localStorage persistence. Smooth transition animation.', status: 'todo', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 1, title: 'Implement dashboard analytics caching', desc: 'Add Redis caching layer for dashboard aggregations with 5-minute TTL. Invalidate on relevant mutations via Socket.io events.', status: 'todo', assigneeIdx: 2 },

    // --- Realtime Collaboration (10 tasks) ---
    { projectIdx: 2, title: 'Set up WebSocket server infrastructure', desc: 'Initialize Socket.io server with Express integration. Configure CORS, authentication middleware, and namespace isolation per workspace.' },
    { projectIdx: 2, title: 'Implement Socket.io event broadcasting', desc: 'Build event broadcasting system for task mutations, comment additions, and project changes. Support room-based subscriptions.', assigneeIdx: 2 },
    { projectIdx: 2, title: 'Build real-time cursor presence indicators', desc: 'Show which users are currently viewing the same task or project. Display avatar bubbles with online status dots.', assigneeIdx: 1 },
    { projectIdx: 2, title: 'Add typing indicators for comments', desc: 'Show "typing..." indicators when users are writing comments. Debounce events and auto-clear after inactivity.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 2, title: 'Implement WebSocket reconnection with backoff', desc: 'Add exponential backoff reconnection strategy with jitter. Queue pending events during disconnection and replay on reconnect.', assigneeIdx: 2 },
    { projectIdx: 2, title: 'Add real-time task board updates', desc: 'Broadcast Kanban board changes (status moves, reordering) to all connected clients. Optimistic UI with server reconciliation.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 2, title: 'Build collaborative editing foundation', desc: 'Set up operational transform or CRDT-based collaborative editing for task descriptions. Start with lock-based editing.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 2, title: 'Implement presence heartbeat system', desc: 'Send periodic heartbeat events (every 15s) to track online users. Mark users as away after 60s of silence.', status: 'done', assigneeIdx: 1 },
    { projectIdx: 2, title: 'Add connection status indicator component', desc: 'Create a connection status badge showing connected/reconnecting/disconnected states with relevant icons and messages.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 2, title: 'Scale WebSocket to handle concurrent connections', desc: 'Configure Socket.io adapter with Redis for horizontal scaling. Test with 10k concurrent connections using artillery.io.', status: 'todo', priority: 'high', assigneeIdx: 2 },

    // --- Task Management (14 tasks) ---
    { projectIdx: 3, title: 'Implement CRUD operations for tasks', desc: 'Build full REST API for task management: create, read, update, delete with proper validation, authorization, and activity logging.' },
    { projectIdx: 3, title: 'Build Kanban board drag and drop', desc: 'Implement drag-and-drop between status columns with smooth animations. Support multi-select and bulk status changes.', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Add subtask create/complete/delete', desc: 'Build subtask system with inline creation, checkbox completion with strikethrough, and swipe-to-delete gesture.', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Implement task search and filtering', desc: 'Add full-text search across task titles and descriptions. Filter by status, priority, assignee, label, due date, and custom date ranges.', assigneeIdx: 2 },
    { projectIdx: 3, title: 'Build task detail modal with all fields', desc: 'Create a full-featured task detail view with inline editing, labels, comments, activity timeline, attachments, and subtask checklist.', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Add bulk task operations', desc: 'Support multi-select on Kanban board with bulk actions: move status, change priority, reassign, add labels, delete.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Implement task labels system', desc: 'Build CRUD for task labels with color coding. Support label assignment, filtering by label, and label management UI.', assigneeIdx: 3 },
    { projectIdx: 3, title: 'Add task activity timeline', desc: 'Display chronological activity log for each task: created, assigned, status changes, comments, and attachment uploads.', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 3, title: 'Build comment system with real-time updates', desc: 'Create threaded comments with Markdown support, @mentions, file attachments, and real-time updates via Socket.io.', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Add task dependencies feature', desc: 'Implement blocking/blocked-by relationships between tasks. Visual indicators on Kanban cards and dependency graph.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 3, title: 'Implement task templates', desc: 'Allow users to create tasks from templates with predefined fields, labels, subtasks, and checklists. Template management UI.', status: 'todo', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 3, title: 'Build recurring task support', desc: 'Implement recurrence rules (daily, weekly, monthly) using iCalendar RRULE format. Auto-generate tasks on schedule.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 3, title: 'Add task position reordering', desc: 'Implement drag-to-reorder within status columns. Save position index and support custom sorting (priority, due date, manual).', assigneeIdx: 1 },
    { projectIdx: 3, title: 'Build task quick-create command palette', desc: 'Create Ctrl+K command palette with quick task creation, navigation, and actions. Fuzzy search across all workspace items.', assigneeIdx: 1 },

    // --- Analytics (10 tasks) ---
    { projectIdx: 4, title: 'Build workspace analytics dashboard', desc: 'Create analytics overview with key metrics: total tasks, completion rate, average cycle time, and workload distribution.' },
    { projectIdx: 4, title: 'Implement task completion rate metrics', desc: 'Calculate and display completion rate per project, per user, and over time. Show trend arrows and percentage changes.', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Add burndown chart component', desc: 'Build interactive burndown and burnup charts for sprint tracking. Show ideal vs actual progress with day-by-day breakdown.', assigneeIdx: 1 },
    { projectIdx: 4, title: 'Build user productivity reports', desc: 'Generate per-user productivity reports with task completion counts, average time per task, and trend analysis.', priority: 'low', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Implement project velocity tracking', desc: 'Track project velocity over sprints with moving averages. Display velocity chart and provide forecasting.', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Add data aggregation service layer', desc: 'Build a dedicated aggregation service with materialized views for complex analytics queries. Cache results aggressively.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Build CSV report export endpoint', desc: 'Create server-side CSV export for any analytics view. Support date range, project filter, and column selection.', priority: 'low', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Implement trend calculation algorithms', desc: 'Calculate week-over-week and month-over-month trends for all metrics. Handle edge cases with insufficient data.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 4, title: 'Add granular date range filtering', desc: 'Support custom date range picker with presets (7d, 30d, 90d, this quarter, this year). Persist selections.', status: 'todo', assigneeIdx: 1 },
    { projectIdx: 4, title: 'Build team workload visualization', desc: 'Show team member workload with capacity indicators. Display assigned tasks, overdue items, and estimated hours.', status: 'todo', assigneeIdx: 1 },

    // --- Notifications (10 tasks) ---
    { projectIdx: 5, title: 'Implement in-app notification system', desc: 'Build notification system with real-time delivery via Socket.io. Support notification types: assignment, mention, comment, completion.' },
    { projectIdx: 5, title: 'Build notification preferences page', desc: 'Create UI for per-channel notification preferences (in-app, email, push) per event type with granularity to project level.', assigneeIdx: 1 },
    { projectIdx: 5, title: 'Add email notification integration', desc: 'Integrate with email service (SendGrid/Mailgun) for digest and real-time email notifications. HTML template rendering.', assigneeIdx: 2 },
    { projectIdx: 5, title: 'Implement push notification support', desc: 'Add push notification support using Firebase Cloud Messaging. Handle permission prompts and token management.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 5, title: 'Build notification grouping and filtering', desc: 'Group notifications by task/project. Support read/unread state, mark all as read, and filter by type.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 5, title: 'Add mention detection and notification', desc: 'Parse @mentions in comments and descriptions. Send instant notifications with context preview to mentioned users.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 5, title: 'Implement notification read/unread state', desc: 'Track per-notification read status. Update unread badge count in real-time. Support bulk mark as read.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 5, title: 'Build notification history with pagination', desc: 'Display paginated notification history with infinite scroll. Support date-based grouping and search.', status: 'todo', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 5, title: 'Add notification digest (daily/weekly)', desc: 'Generate periodic digest emails summarizing activity. Include task completions, new assignments, and upcoming deadlines.', assigneeIdx: 2 },
    { projectIdx: 5, title: 'Build notification center dropdown', desc: 'Create header dropdown showing recent notifications with avatars, action links, and quick mark-as-read.', assigneeIdx: 1 },

    // --- Performance (10 tasks) ---
    { projectIdx: 6, title: 'Implement database query optimization', desc: 'Profile and optimize slow queries. Add EXPLAIN ANALYZE analysis, N+1 query detection, and query plan optimization.' },
    { projectIdx: 6, title: 'Add database indexing strategy', desc: 'Design and implement indexing strategy covering frequent query patterns. Add composite indexes for filtered/sorted queries.', assigneeIdx: 2 },
    { projectIdx: 6, title: 'Build frontend lazy loading modules', desc: 'Implement code splitting with React.lazy and Suspense. Lazy load route components and heavy third-party libraries.', assigneeIdx: 1 },
    { projectIdx: 6, title: 'Implement API response caching layer', desc: 'Add Redis-based API response caching with tag-based invalidation. Cache list endpoints with configurable TTL.', assigneeIdx: 2 },
    { projectIdx: 6, title: 'Add image and asset optimization', desc: 'Set up image optimization pipeline with sharp.js. Implement responsive images, WebP conversion, and CDN caching.', assigneeIdx: 1 },
    { projectIdx: 6, title: 'Implement pagination for all list endpoints', desc: 'Add cursor-based pagination to all list endpoints. Include total count, next cursor, and configurable page size.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 6, title: 'Add performance monitoring and logging', desc: 'Integrate with monitoring service (DataDog/New Relic). Add request timing middleware and slow query logging.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 6, title: 'Build load testing infrastructure', desc: 'Create artillery.io scripts for load testing. Test authentication, task CRUD, and WebSocket connection scenarios.', status: 'todo', assigneeIdx: 4 },
    { projectIdx: 6, title: 'Optimize frontend bundle size', desc: 'Audit bundle with webpack-bundle-analyzer. Remove unused dependencies and implement tree-shaking optimizations.', assigneeIdx: 1 },
    { projectIdx: 6, title: 'Add database connection pooling', desc: 'Configure PgBouncer for connection pooling. Optimize pool size based on workload patterns and server resources.', assigneeIdx: 2 },

    // --- Deployment (8 tasks) ---
    { projectIdx: 7, title: 'Set up CI/CD pipeline with GitHub Actions', desc: 'Create CI workflow for linting, type checking, and testing. CD workflow for staging and production deployment with approval gates.' },
    { projectIdx: 7, title: 'Configure Docker containerization', desc: 'Write multi-stage Dockerfiles for backend and frontend. Use Docker Compose for local development with PostgreSQL and Redis.', assigneeIdx: 2 },
    { projectIdx: 7, title: 'Set up staging environment', desc: 'Deploy staging environment with production parity. Configure branch-based deployments for feature previews.', assigneeIdx: 2 },
    { projectIdx: 7, title: 'Implement database migration automation', desc: 'Add automated Prisma migration as part of CI/CD. Run migrations in transactions with rollback on failure.', assigneeIdx: 2 },
    { projectIdx: 7, title: 'Add health check endpoints', desc: 'Create /health and /readiness endpoints. Check database connectivity, Redis connection, and disk space.', priority: 'low', assigneeIdx: 2 },
    { projectIdx: 7, title: 'Configure SSL certificate auto-renewal', desc: 'Set up Let\'s Encrypt with certbot for automatic SSL renewal. Configure Nginx reverse proxy with HTTPS redirect.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 7, title: 'Implement blue/green deployment strategy', desc: 'Set up load balancer with blue/green deployment. Zero-downtime migrations with connection draining.', status: 'in_progress', assigneeIdx: 2 },
    { projectIdx: 7, title: 'Build deployment rollback mechanism', desc: 'Create automated rollback on deployment failure. Maintain last 5 successful deployments for quick recovery.', status: 'todo', assigneeIdx: 1 },

    // --- Documentation (8 tasks) ---
    { projectIdx: 8, title: 'Write API documentation with Swagger/OpenAPI', desc: 'Document all REST API endpoints with request/response schemas, authentication requirements, and example payloads.' },
    { projectIdx: 8, title: 'Create onboarding guide for new developers', desc: 'Write comprehensive onboarding guide covering local setup, architecture overview, coding standards, and contribution workflow.', priority: 'low', assigneeIdx: 5 },
    { projectIdx: 8, title: 'Document database schema and relationships', desc: 'Create ERD diagrams and document all tables, relationships, indexes, and migration patterns.', priority: 'low', assigneeIdx: 2 },
    { projectIdx: 8, title: 'Write deployment and infrastructure docs', desc: 'Document deployment architecture, environment variables, scaling strategy, and disaster recovery procedures.', assigneeIdx: 2 },
    { projectIdx: 8, title: 'Create user-facing feature documentation', desc: 'Write user documentation for key features: workspaces, projects, tasks, Kanban, analytics, and notifications.', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 8, title: 'Add inline code documentation standards', desc: 'Document code style guidelines, JSDoc conventions, and comment standards. Add ESLint rules for documentation linting.', status: 'in_progress', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 8, title: 'Write testing guidelines and best practices', desc: 'Document testing strategy covering unit, integration, and E2E tests. Include example patterns and mocking approaches.', status: 'todo', priority: 'low', assigneeIdx: 4 },
    { projectIdx: 8, title: 'Create architecture decision records', desc: 'Document key architectural decisions with context, options considered, and rationale. Use ADR template format.', status: 'todo', assigneeIdx: 2 },

    // --- Design System (10 tasks) ---
    { projectIdx: 9, title: 'Define color palette and typography tokens', desc: 'Create comprehensive design tokens for colors, typography, spacing, and elevation. Support light and dark themes.', assigneeIdx: 3 },
    { projectIdx: 9, title: 'Build button component with variants', desc: 'Create button component with primary, secondary, outline, ghost, and danger variants. Support loading, disabled, and icon states.', assigneeIdx: 1 },
    { projectIdx: 9, title: 'Create form input components', desc: 'Build TextInput, Select, Checkbox, Radio, and Switch components with consistent styling, validation states, and accessibility.', assigneeIdx: 3 },
    { projectIdx: 9, title: 'Build modal/dialog component system', desc: 'Create modal system with slide-up, center, and full-screen variants. Support backdrop press, keyboard dismiss, and focus trap.', assigneeIdx: 1 },
    { projectIdx: 9, title: 'Implement notification banner component', desc: 'Build toast and banner notification components with success, error, warning, and info variants. Queue multiple notifications.', assigneeIdx: 1 },
    { projectIdx: 9, title: 'Create card and surface component variants', desc: 'Build Card component with elevation levels, pressable state, and content slots. Include skeleton loading state.', assigneeIdx: 3 },
    { projectIdx: 9, title: 'Build avatar component with fallback initials', desc: 'Create Avatar component with image, initials fallback, online status dot, and size variants. Support group avatars.', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 9, title: 'Add animation and transition system', desc: 'Create reusable animation primitives: fade, slide, scale, and spring. Use React Native Animated API with configurable durations.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 9, title: 'Build theme switcher (light/dark mode)', desc: 'Implement theme system with light and dark variants. Auto-detect system preference and allow manual override.', assigneeIdx: 3 },
    { projectIdx: 9, title: 'Document component usage with examples', desc: 'Create component library documentation with usage examples, props tables, and interactive playground.', status: 'todo', priority: 'low', assigneeIdx: 3 },

    // --- Mobile App (12 tasks) ---
    { projectIdx: 10, title: 'Set up React Native project with Expo', desc: 'Initialize Expo project for the mobile app. ConfigureTypeScript, ESLint, and folder structure. Set up navigation with Expo Router.', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Build mobile navigation structure', desc: 'Create bottom tab navigation with screens: Dashboard, Tasks, Projects, Profile. Add stack navigation within each tab.', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Implement task list view for mobile', desc: 'Build task list with swipe gestures for actions (complete, delete). Pull-to-refresh and infinite scroll pagination.', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Add mobile push notifications', desc: 'Integrate Expo Push Notifications API. Handle notification permissions, token registration, and deep linking from notifications.', assigneeIdx: 2 },
    { projectIdx: 10, title: 'Build offline support with local storage', desc: 'Implement offline-first architecture using SQLite (expo-sqlite). Sync local changes when connectivity resumes.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Implement mobile biometric authentication', desc: 'Add Face ID and fingerprint authentication for app unlock. Secure local storage with biometric gate.', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Build mobile calendar view component', desc: 'Create interactive calendar view with task indicators on dates. Month/week/day toggle with swipe navigation.', status: 'in_progress', assigneeIdx: 3 },
    { projectIdx: 10, title: 'Add mobile file attachment support', desc: 'Integrate expo-file-system and expo-document-picker for file attachments. Upload progress indicator and preview capabilities.', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Implement mobile drag-and-drop Kanban', desc: 'Build touch-optimized Kanban board with horizontal column scroll and vertical card drag. Haptic feedback on drop.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Build mobile activity feed view', desc: 'Display workspace activity feed optimized for mobile. Pull-to-refresh, lazy loading, and rich content preview.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 10, title: 'Add mobile dark mode support', desc: 'Implement dark mode with system preference detection. Smooth transition and consistent styling across all screens.', status: 'todo', priority: 'low', assigneeIdx: 3 },
    { projectIdx: 10, title: 'Implement mobile performance optimizations', desc: 'Optimize list rendering with FlashList, image caching, bundle size reduction, and startup time improvements.', status: 'in_progress', assigneeIdx: 1 },

    // --- Portfolio Website (6 tasks) ---
    { projectIdx: 11, title: 'Design portfolio homepage layout', desc: 'Create a stunning landing page with hero section, skills grid, featured projects carousel, and contact CTA.', assigneeIdx: 3 },
    { projectIdx: 11, title: 'Build project showcase with filtering', desc: 'Create project gallery with category filtering, hover previews, and detailed project modal with tech stack and links.', assigneeIdx: 1 },
    { projectIdx: 11, title: 'Add contact form with backend integration', desc: 'Build contact form with validation, spam protection (honeypot), and email notification via API endpoint.', assigneeIdx: 2 },
    { projectIdx: 11, title: 'Implement dark mode toggle', desc: 'Add theme switcher with smooth CSS transitions. Persist preference in localStorage and respect system setting.', priority: 'low', assigneeIdx: 1 },
    { projectIdx: 11, title: 'Build responsive navigation and footer', desc: 'Create responsive nav with hamburger menu on mobile. Build footer with social links, sitemap, and copyright.', assigneeIdx: 1 },
    { projectIdx: 11, title: 'Add page transition animations', desc: 'Implement fade and slide transitions between pages using Framer Motion. Add scroll-triggered reveal animations.', status: 'in_progress', assigneeIdx: 1 },

    // --- Blog Engine (6 tasks) ---
    { projectIdx: 12, title: 'Set up blog CMS with markdown support', desc: 'Build headless CMS for blog with markdown editor, image uploads, tags, and publish scheduling.', assigneeIdx: 2 },
    { projectIdx: 12, title: 'Build blog listing page with search', desc: 'Create blog index with pagination, tag filtering, search by title, and estimated reading time display.', assigneeIdx: 1 },
    { projectIdx: 12, title: 'Implement RSS feed generation', desc: 'Generate RSS 2.0 and Atom feeds for blog content. Include full content or excerpt option in feed configuration.', assigneeIdx: 2 },
    { projectIdx: 12, title: 'Add syntax highlighting for code blocks', desc: 'Integrate a syntax highlighting library (Prism.js/Shiki) for code blocks in blog posts. Support multiple languages.', assigneeIdx: 1 },
    { projectIdx: 12, title: 'Build newsletter subscription form', desc: 'Add email subscription form with double opt-in. Integrate with email service for campaign management.', status: 'in_progress', assigneeIdx: 1 },
    { projectIdx: 12, title: 'Implement blog analytics tracking', desc: 'Add privacy-focused analytics (Plausible/Umami) for blog posts. Track views, read time, and referral sources.', status: 'todo', priority: 'low', assigneeIdx: 1 },

    // --- Resume Builder (4 tasks) ---
    { projectIdx: 13, title: 'Build dynamic resume editor', desc: 'Create drag-and-drop resume builder with sections: summary, experience, education, skills, and projects. Real-time preview.', assigneeIdx: 1 },
    { projectIdx: 13, title: 'Implement PDF export functionality', desc: 'Generate PDF resumes with proper typography, page breaks, and formatting. Multiple theme templates to choose from.', assigneeIdx: 2 },
    { projectIdx: 13, title: 'Add multiple resume themes', desc: 'Design 3-5 resume theme templates with different layouts, color schemes, and typography combinations.', assigneeIdx: 3 },
    { projectIdx: 13, title: 'Build import from LinkedIn feature', desc: 'Allow users to import profile data from LinkedIn using public profile URL. Parse and map to resume sections.', status: 'todo', assigneeIdx: 2 },
  ];

  const users = [himank, alex, sarah, emma, david, michael];

  const tasks: TaskSeed[] = [];
  let taskCounter = 0;

  for (const def of taskDefs) {
    taskCounter++;
    const project = projects[def.projectIdx];
    const status = def.status || randomStatus(def.projectIdx < 4 ? { done: 90, in_progress: 6, todo: 2, review: 1, backlog: 1 } : def.projectIdx < 10 ? { done: 85, in_progress: 8, todo: 4, review: 2, backlog: 1 } : { done: 75, in_progress: 15, todo: 6, review: 2, backlog: 2 });
    const priority = def.priority || randomPriority();
    const assigneeIdx = def.assigneeIdx !== undefined ? def.assigneeIdx : Math.floor(Math.random() * users.length);
    const createdAt = daysAgo(28 + Math.floor(Math.random() * 20));
    const dueDays = status === 'done' ? -(5 + Math.floor(Math.random() * 20)) : (status === 'in_progress' || status === 'review' ? Math.floor(Math.random() * 10) : 6 + Math.floor(Math.random() * 30));
    const dueDate = dueDays < 0 ? daysAgo(Math.abs(dueDays)) : daysFromNow(dueDays);
    const completedAt = status === 'done' ? randomBetween(createdAt, new Date(Math.min(NOW.getTime(), dueDate.getTime() + 86400000))) : null;

    tasks.push({
      id: uuid(),
      projectId: project.id,
      title: def.title,
      description: def.desc,
      status,
      priority,
      assignedTo: users[assigneeIdx].id,
      dueDate,
      createdAt: new Date(createdAt.getTime() + taskCounter), // ensure unique ordering
      completedAt,
    });
  }

  // Bulk create tasks
  await prisma.task.createMany({ data: tasks.map((t) => ({ ...t, position: 0, updatedAt: t.completedAt || t.createdAt })) });
  console.log(`  ✅ ${tasks.length} tasks created`);

  // ============================================================
  // 7. LABEL ASSIGNMENTS
  // ============================================================
  const labelAssignments: { taskId: string; labelId: string }[] = [];
  for (const task of tasks) {
    const projectLabels = allLabels.filter((l) => l.projectId === task.projectId);
    if (projectLabels.length > 0) {
      const count = 1 + Math.floor(Math.random() * 3);
      const picked = pickN(projectLabels, count);
      for (const label of picked) {
        labelAssignments.push({ taskId: task.id, labelId: label.id });
      }
    }
  }

  await prisma.taskLabelAssignment.createMany({ data: labelAssignments });
  console.log(`  ✅ ${labelAssignments.length} label assignments created`);

  // ============================================================
  // 8. SUBTASKS (~360 — ~3 per task on average)
  // ============================================================
  const subtaskTitles = [
    'Write unit tests', 'Update API documentation', 'Review PR comments',
    'Add input validation', 'Handle error states', 'Write integration tests',
    'Add loading skeleton', 'Mobile responsive check', 'Cross-browser testing',
    'Accessibility audit', 'Performance benchmark', 'Database migration script',
    'Update type definitions', 'Add analytics tracking', 'Security review',
    'Add logging', 'Create Storybook stories', 'Add keyboard shortcuts',
    'Write E2E tests', 'Localization setup', 'Add tooltip help text',
    'Dark mode support', 'Loading state component', 'Empty state component',
    'Error boundary implementation', 'API rate limit handling', 'Pagination support',
    'Search/filter implementation', 'Sort functionality', 'Export data function',
  ];

  const subtasks: { id: string; taskId: string; title: string; completed: boolean; position: number; createdAt: Date; updatedAt: Date }[] = [];
  for (const task of tasks) {
    const count = 1 + Math.floor(Math.random() * 4); // 1-4 subtasks per task
    const selectedTitles = pickN(subtaskTitles, count);
    for (let i = 0; i < selectedTitles.length; i++) {
      const completed = task.completedAt !== null ? Math.random() > 0.25 : Math.random() > 0.6;
      const createdAt = randomBetween(daysAgo(20), task.createdAt);
      subtasks.push({
        id: uuid(),
        taskId: task.id,
        title: selectedTitles[i],
        completed,
        position: i,
        createdAt: new Date(createdAt.getTime() + i),
        updatedAt: completed ? randomBetween(createdAt, new Date()) : createdAt,
      });
    }
  }

  await prisma.subtask.createMany({ data: subtasks });
  console.log(`  ✅ ${subtasks.length} subtasks created`);

  // ============================================================
  // 9. COMMENTS (300+)
  // ============================================================
  const commentPool = [
    'Looks good. I\'ll handle the API integration on my end.',
    'This query needs optimization — there\'s an N+1 issue in the join.',
    'Merged after review. Great work on the edge cases!',
    'Please rebase on main before merging. There are conflicts in the types file.',
    'I found a regression in the login flow. The session token isn\'t being refreshed properly.',
    'Can we add pagination here? This endpoint will struggle with large datasets.',
    'The responsive fix works well, but the tablet layout needs adjustment.',
    'I\'ve updated the PR with the requested changes. Ready for re-review.',
    'Let\'s discuss the architecture in tomorrow\'s standup. I have some concerns about the WebSocket scaling approach.',
    'Added error boundaries and loading states. The component is now production-ready.',
    'This is a solid implementation. Ship it after the tests pass.',
    'I noticed the bundle size increased by 15KB. Can we tree-shake the unused imports?',
    'The dark mode colors look off in the sidebar. Let me fix the contrast ratios.',
    'I\'ll take over this ticket since Alex is out sick.',
    'Test coverage is at 89% for this module. Nice work on the edge case tests.',
    'The migration script needs a down method before we can merge.',
    'Can we add type safety to this handler? The `any` cast makes me nervous.',
    'I\'ve deployed this to staging. Please verify the integration works end-to-end.',
    'The animation feels janky on low-end devices. Let me add `shouldRasterizeIOS` and `needsOffscreenAlphaCompositing`.',
    'I think we should split this into two smaller PRs for easier review.',
    'Approved with one nit: can we rename `fetchData` to `getTaskData` for consistency?',
    'This fixes the memory leak in the WebSocket reconnection handler.',
    'I\'ve added the requested changes. The diff is cleaner now.',
    'Can someone review the API contract before I implement the frontend?',
    'The build is failing because of a type mismatch in the Prisma schema.',
    'I\'ll pair with Sarah on this to make sure the backend contract matches.',
    'Added Retry-After header support to the rate limiter middleware.',
    'This is a great candidate for our new design system component pattern.',
    'I moved the logic to a custom hook. The component is much cleaner now.',
    'The database index improved query time from 2.3s to 45ms. Huge win!',
    'Can we add a confirm dialog before destructive actions?',
    'I\'ve addressed all the review comments. PTAL.',
    'The E2E tests are flaky in CI. I suspect a race condition with the WebSocket connection.',
    'We should add this to the onboarding docs — new hires keep asking about this setup.',
    'I\'ve added optimistic UI updates. The UX feels much snappier now.',
    'The accessibility audit flagged the color contrast on the status badges. Fixing now.',
    'Let me create a utility function so we can reuse this pattern across the app.',
    'I\'ve replaced the deprecated API with the new v2 endpoint.',
    'The push notification token needs to be refreshed on app foreground.',
    'I think we need a design review before we implement this further.',
    'Added comprehensive error tracking with context about the user state.',
    'The JSON fields in PostgreSQL are working great for the activity log details.',
    'I refactored the selector to use `createSelector` from Reselect. Performance is much better.',
    'Can we add a loading skeleton here? The blank screen is jarring.',
    'I\'ve verified the fix on iOS 16, 17, and 18. All passing.',
    'The Redis cache hit rate is now at 94% after the latest optimization.',
    'I\'ve added the `useCallback` wrappers to prevent unnecessary re-renders.',
    'Let me update the seed data to include this edge case scenario.',
    'The CI/CD pipeline is green. Deploying to production after lunch.',
    'I think we\'re over-engineering this. Let me propose a simpler solution in the RFC.',
    'The GraphQL migration is on hold until we resolve the N+1 issue.',
    'I\'ve added a migration guard to prevent accidental data loss in production.',
    'The new deployment strategy cut our deploy time from 12min to 3min.',
    'I\'ve updated the PR template to include a checklist for accessibility testing.',
    'Can we schedule a performance review of the dashboard queries? They\'re getting slow.',
    'I\'m seeing a 5% improvement in Time to Interactive after lazy loading the charts.',
    'The Android build is failing due to a missing native module. Investigating.',
    'I\'ve added a debounce to the search input. The API calls dropped by 80%.',
    'The session management fix prevents the "flash of logged-out content" on page reload.',
    'I think the mobile nav needs a gesture-based back swipe. I\'ll add it.',
    'Let me write a migration to backfill the missing timestamps on existing records.',
  ];

  const comments: { taskId: string; userId: string; content: string; createdAt: Date; updatedAt: Date }[] = [];
  const tasksWithComments = pickN(tasks, Math.min(95, tasks.length));

  for (const task of tasksWithComments) {
    const commentCount = 2 + Math.floor(Math.random() * 5); // 2-6 comments per task
    const selectedComments = pickN(commentPool, commentCount);
    const taskCreatedAt = task.createdAt;
    const timeSlots: Date[] = [];
    for (let i = 0; i < selectedComments.length; i++) {
      const offset = i * (5 + Math.floor(Math.random() * 20));
      const commentTime = new Date(taskCreatedAt.getTime() + offset * 3600000);
      if (commentTime > new Date()) break;
      timeSlots.push(commentTime);
    }

    for (let i = 0; i < Math.min(selectedComments.length, timeSlots.length); i++) {
      const commenter = task.assignedTo
        ? (Math.random() > 0.4 ? users.find((u) => u.id === task.assignedTo)! : pick(users.filter((u) => u.id !== task.assignedTo)))
        : pick(users);
      comments.push({
        taskId: task.id,
        userId: commenter.id,
        content: selectedComments[i],
        createdAt: timeSlots[i],
        updatedAt: timeSlots[i],
      });
    }
  }

  await prisma.comment.createMany({ data: comments });
  console.log(`  ✅ ${comments.length} comments created`);

  // ============================================================
  // 9b. REPLY COMMENTS (~15)
  // ============================================================
  const createdComments = await prisma.comment.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
  const replyPool = [
    'Great point! I agree with this approach.',
    'I had the same thought. Let me take a closer look.',
    'This is exactly what we discussed in standup.',
    'Can you elaborate on the timeline?',
    'Makes sense. I\'ll update the implementation accordingly.',
    'Thanks for the detailed explanation!',
    'I noticed this too. Good catch.',
    'Let me sync with the team on this.',
    'This should be addressed in the next sprint.',
    'I\'ve updated the PR with the changes you suggested.',
    'Agreed. Let\'s prioritize this for the release.',
    'Good question. I\'ll investigate and follow up.',
    'This is consistent with our architecture decisions.',
    'Can we add this to the testing plan?',
    'I\'ll create a follow-up ticket for this.',
  ];
  const replyComments: { id: string; taskId: string; userId: string; parentId: string; content: string; createdAt: Date; updatedAt: Date }[] = [];
  for (let i = 0; i < Math.min(createdComments.length, replyPool.length); i++) {
    const parent = createdComments[i];
    const replier = pick(users.filter(u => u.id !== parent.userId));
    replyComments.push({
      id: uuid(),
      taskId: parent.taskId,
      userId: replier.id,
      parentId: parent.id,
      content: replyPool[i],
      createdAt: new Date(parent.createdAt.getTime() + 3600000 * (1 + i)),
      updatedAt: new Date(parent.createdAt.getTime() + 3600000 * (1 + i)),
    });
  }
  await prisma.comment.createMany({ data: replyComments });
  console.log(`  ✅ ${replyComments.length} reply comments created`);

  // ============================================================
  // 9c. COMMENT REACTIONS (~60)
  // ============================================================
  const reactionEmojis = ['👍', '❤️', '😄', '🎉', '😢', '😮'];
  const allForReactions = await prisma.comment.findMany({ take: 40, orderBy: { createdAt: 'desc' } });
  const reactions: { id: string; commentId: string; userId: string; emoji: string; createdAt: Date }[] = [];
  for (const comment of allForReactions) {
    const reactorCount = 1 + Math.floor(Math.random() * 3);
    const reactors = pickN(users, reactorCount);
    for (const reactor of reactors) {
      const emoji = pick(reactionEmojis);
      const exists = reactions.some(r => r.commentId === comment.id && r.userId === reactor.id && r.emoji === emoji);
      if (!exists) {
        reactions.push({
          id: uuid(),
          commentId: comment.id,
          userId: reactor.id,
          emoji,
          createdAt: new Date(comment.createdAt.getTime() + 3600000 * Math.floor(Math.random() * 24)),
        });
      }
    }
  }
  await prisma.commentReaction.createMany({ data: reactions });
  console.log(`  ✅ ${reactions.length} comment reactions created`);

  // ============================================================
  // 10. ATTACHMENTS (25)
  // ============================================================
  const attachmentDefs = [
    { fileName: 'wireframe-dashboard-v2.png', mimeType: 'image/png', size: 245760 },
    { fileName: 'design-system.fig', mimeType: 'application/fig', size: 4194304 },
    { fileName: 'api-docs-v2.pdf', mimeType: 'application/pdf', size: 1048576 },
    { fileName: 'sprint-planning-q3.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 51200 },
    { fileName: 'user-flow-auth.png', mimeType: 'image/png', size: 189440 },
    { fileName: 'architecture-overview.png', mimeType: 'image/png', size: 312576 },
    { fileName: 'onboarding-checklist.pdf', mimeType: 'application/pdf', size: 24576 },
    { fileName: 'database-schema.png', mimeType: 'image/png', size: 456704 },
    { fileName: 'sprint-retrospective.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 2097152 },
    { fileName: 'performance-benchmarks.csv', mimeType: 'text/csv', size: 8192 },
    { fileName: 'mobile-mockups.fig', mimeType: 'application/fig', size: 7340032 },
    { fileName: 'analytics-dashboard.png', mimeType: 'image/png', size: 289792 },
    { fileName: 'deployment-playbook.md', mimeType: 'text/markdown', size: 4096 },
    { fileName: 'load-test-results.json', mimeType: 'application/json', size: 65536 },
    { fileName: 'brand-guidelines.pdf', mimeType: 'application/pdf', size: 524288 },
    { fileName: 'meeting-notes-sprint-12.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 35840 },
    { fileName: 'component-library-storybook.pdf', mimeType: 'application/pdf', size: 786432 },
    { fileName: 'security-audit-report.pdf', mimeType: 'application/pdf', size: 1572864 },
    { fileName: 'roadmap-q3-2025.png', mimeType: 'image/png', size: 204800 },
    { fileName: 'icon-set.svg', mimeType: 'image/svg+xml', size: 12288 },
    { fileName: 'error-tracking-setup.pdf', mimeType: 'application/pdf', size: 102400 },
    { fileName: 'code-review-checklist.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 28672 },
    { fileName: 'style-guide-variables.json', mimeType: 'application/json', size: 15360 },
    { fileName: 'user-research-report.pdf', mimeType: 'application/pdf', size: 2097152 },
    { fileName: 'release-notes-v2.1.md', mimeType: 'text/markdown', size: 2048 },
  ];

  const attachmentData: { id: string; taskId: string; uploadedBy: string; fileName: string; fileUrl: string; mimeType: string; size: number; createdAt: Date }[] = [];
  const tasksWithAttachments = pickN(tasks, Math.min(25, tasks.length));

  for (let i = 0; i < Math.min(tasksWithAttachments.length, attachmentDefs.length); i++) {
    const task = tasksWithAttachments[i];
    const att = attachmentDefs[i];
    const uploader = task.assignedTo ? users.find((u) => u.id === task.assignedTo)! : pick(users);
    attachmentData.push({
      id: uuid(),
      taskId: task.id,
      uploadedBy: uploader.id,
      fileName: att.fileName,
      fileUrl: `https://synapse-storage.s3.amazonaws.com/uploads/${att.fileName}`,
      mimeType: att.mimeType,
      size: att.size,
      createdAt: randomBetween(task.createdAt, new Date(Math.min(NOW.getTime(), (task.completedAt || NOW).getTime()))),
    });
  }

  await prisma.attachment.createMany({ data: attachmentData });
  console.log(`  ✅ ${attachmentData.length} attachments created`);

  // ============================================================
  // 11. NOTIFICATIONS (40)
  // ============================================================
  const notifTypes = ['task_assigned', 'comment_added', 'mention', 'task_completed', 'status_changed', 'due_date_approaching'];
  const notifTemplates = [
    (u: string) => ({ title: 'Task Assigned', content: `You have been assigned to "${u}"` }),
    (u: string) => ({ title: 'New Comment', content: `New comment on "${u}"` }),
    (u: string) => ({ title: 'You were mentioned', content: `You were mentioned in "${u}"` }),
    (u: string) => ({ title: 'Task Completed', content: `"${u}" has been marked as done` }),
    (u: string) => ({ title: 'Status Changed', content: `"${u}" status was updated` }),
    (u: string) => ({ title: 'Due Date Approaching', content: `"${u}" is due tomorrow` }),
  ];

  const notifications: { userId: string; type: string; title: string; content: string; read: boolean; createdAt: Date }[] = [];
  const notifTasks = pickN(tasks, 40);

  for (let i = 0; i < notifTasks.length; i++) {
    const task = notifTasks[i];
    const typeIdx = Math.floor(Math.random() * notifTypes.length);
    const template = notifTemplates[typeIdx];
    const recipient = task.assignedTo ? users.find((u) => u.id === task.assignedTo)! : pick(users);
    const notif = template(task.title);
    notifications.push({
      userId: recipient.id,
      type: notifTypes[typeIdx],
      title: notif.title,
      content: notif.content,
      read: Math.random() > 0.6,
      createdAt: randomBetween(task.createdAt, new Date()),
    });
  }

  await prisma.notification.createMany({ data: notifications });
  console.log(`  ✅ ${notifications.length} notifications created`);

  // ============================================================
  // 12. ACTIVITY LOGS (200+)
  // ============================================================

  const activityLogs: { workspaceId: string; taskId: string | null; userId: string; action: string; details: object; createdAt: Date }[] = [];

  // Activity from task creation events (one per task)
  for (const task of tasks) {
    const project = projects.find((p) => p.id === task.projectId)!;
    const ws = wsDefs.find((w) => w.id === project.workspaceId)!;
    const creator = task.assignedTo ? pick(users.filter((u) => u.id !== task.assignedTo)) : pick(users);
    activityLogs.push({
      workspaceId: ws.id,
      taskId: task.id,
      userId: creator.id,
      action: 'task.created',
      details: { title: task.title, projectName: project.name },
      createdAt: new Date(task.createdAt.getTime() - 60000),
    });
  }

  // Activity from status changes
  for (const task of tasks.filter((t) => t.status !== 'todo')) {
    const project = projects.find((p) => p.id === task.projectId)!;
    const ws = wsDefs.find((w) => w.id === project.workspaceId)!;
    const actor = task.assignedTo ? users.find((u) => u.id === task.assignedTo)! : pick(users);
    activityLogs.push({
      workspaceId: ws.id,
      taskId: task.id,
      userId: actor.id,
      action: 'task.status_changed',
      details: { from: 'todo', to: task.status },
      createdAt: randomBetween(task.createdAt, task.completedAt || new Date()),
    });
  }

  // Activity from comments
  for (const comment of comments.slice(0, 80)) {
    const task = tasks.find((t) => t.id === comment.taskId)!;
    const project = projects.find((p) => p.id === task.projectId)!;
    const ws = wsDefs.find((w) => w.id === project.workspaceId)!;
    activityLogs.push({
      workspaceId: ws.id,
      taskId: task.id,
      userId: comment.userId,
      action: 'comment.created',
      details: { preview: comment.content.slice(0, 60) },
      createdAt: comment.createdAt,
    });
  }

  // Activity from assignments
  for (const task of tasks.filter((t) => t.assignedTo)) {
    const project = projects.find((p) => p.id === task.projectId)!;
    const ws = wsDefs.find((w) => w.id === project.workspaceId)!;
    const assigner = pick(users.filter((u) => u.id !== task.assignedTo));
    activityLogs.push({
      workspaceId: ws.id,
      taskId: task.id,
      userId: assigner.id,
      action: 'task.assigned',
      details: { assignee: users.find((u) => u.id === task.assignedTo)?.name },
      createdAt: new Date(task.createdAt.getTime() + 3600000),
    });
  }

  // Activity from completions
  for (const task of tasks.filter((t) => t.status === 'done' && t.completedAt)) {
    const project = projects.find((p) => p.id === task.projectId)!;
    const ws = wsDefs.find((w) => w.id === project.workspaceId)!;
    const completer = task.assignedTo ? users.find((u) => u.id === task.assignedTo)! : pick(users);
    activityLogs.push({
      workspaceId: ws.id,
      taskId: task.id,
      userId: completer.id,
      action: 'task.completed',
      details: { completionTime: task.completedAt!.toISOString() },
      createdAt: task.completedAt!,
    });
  }

  await prisma.activityLog.createMany({ data: activityLogs });
  console.log(`  ✅ ${activityLogs.length} activity logs created`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
  const todoCount = tasks.filter((t) => t.status === 'todo' || t.status === 'backlog').length;
  const completionRate = ((doneCount / tasks.length) * 100).toFixed(1);

  console.log(`\n📊 Seed Summary:`);
  console.log(`  Users:             ${userDefs.length}`);
  console.log(`  Workspaces:        ${wsDefs.length}`);
  console.log(`  Projects:          ${projects.length}`);
  console.log(`  Labels:            ${allLabels.length}`);
  console.log(`  Tasks:             ${tasks.length} (${doneCount} done, ${inProgressCount} in progress, ${todoCount} todo)`);
  console.log(`  Completion Rate:   ${completionRate}%`);
  console.log(`  Subtasks:          ${subtasks.length}`);
  console.log(`  Comments:          ${comments.length + replyComments.length} (${replyComments.length} replies)`);
  console.log(`  Comment Reactions: ${reactions.length}`);
  console.log(`  Attachments:       ${attachmentData.length}`);
  console.log(`  Notifications:     ${notifications.length}`);
  console.log(`  Activity Logs:     ${activityLogs.length}`);
  console.log(`\n✅ Seed complete!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
