import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function uuid(): string {
  return crypto.randomUUID();
}

async function main() {
  console.log('🌱 Seeding Synapse database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Clean existing seed data (ordered by FK constraints)
  await prisma.taskLabelAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Create users with deterministic email uniqueness
  const aliceId = uuid();
  const bobId = uuid();
  const charlieId = uuid();

  const alice = await prisma.user.create({
    data: { id: aliceId, email: 'alice@synapse.dev', passwordHash, name: 'Alice Johnson' },
  });
  const bob = await prisma.user.create({
    data: { id: bobId, email: 'bob@synapse.dev', passwordHash, name: 'Bob Smith' },
  });
  const charlie = await prisma.user.create({
    data: { id: charlieId, email: 'charlie@synapse.dev', passwordHash, name: 'Charlie Davis' },
  });

  console.log(`  ✅ Users: ${alice.name}, ${bob.name}, ${charlie.name}`);

  // Create workspace
  const workspaceId = uuid();
  const workspace = await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: 'Synapse Development',
      description: 'Main workspace for Synapse platform development',
      ownerId: alice.id,
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: alice.id, role: 'owner' },
      { workspaceId: workspace.id, userId: bob.id, role: 'admin' },
      { workspaceId: workspace.id, userId: charlie.id, role: 'member' },
    ],
  });

  console.log(`  ✅ Workspace: ${workspace.name}`);

  // Create projects
  const mobileAppId = uuid();
  const backendApiId = uuid();
  const marketingId = uuid();

  const mobileApp = await prisma.project.create({
    data: {
      id: mobileAppId,
      workspaceId: workspace.id,
      name: 'Mobile App',
      description: 'React Native mobile application development',
      color: '#6366F1',
      ownerId: alice.id,
    },
  });
  const backendApi = await prisma.project.create({
    data: {
      id: backendApiId,
      workspaceId: workspace.id,
      name: 'Backend API',
      description: 'Node.js backend API services',
      color: '#10B981',
      ownerId: bob.id,
    },
  });
  const marketing = await prisma.project.create({
    data: {
      id: marketingId,
      workspaceId: workspace.id,
      name: 'Marketing Website',
      description: 'Company marketing website redesign',
      color: '#F59E0B',
      ownerId: alice.id,
    },
  });

  console.log(`  ✅ Projects: ${mobileApp.name}, ${backendApi.name}, ${marketing.name}`);

  // Create labels
  const labels = {
    bug: await prisma.taskLabel.create({
      data: { projectId: mobileApp.id, name: 'Bug', color: '#EF4444' },
    }),
    feature: await prisma.taskLabel.create({
      data: { projectId: mobileApp.id, name: 'Feature', color: '#6366F1' },
    }),
    enhancement: await prisma.taskLabel.create({
      data: { projectId: mobileApp.id, name: 'Enhancement', color: '#10B981' },
    }),
    research: await prisma.taskLabel.create({
      data: { projectId: mobileApp.id, name: 'Research', color: '#F59E0B' },
    }),
  };

  console.log(`  ✅ Labels: ${Object.keys(labels).join(', ')}`);

  // Create tasks
  const now = new Date();
  const days = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };

  type TaskSeed = {
    projectId: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: string | null;
    dueDate: Date;
    labels: typeof labels[keyof typeof labels][];
  };

  const taskSeeds: TaskSeed[] = [
    { projectId: mobileApp.id, title: 'User authentication screen', status: 'done', priority: 'high', assignedTo: alice.id, dueDate: days(-3), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Dashboard analytics widget', status: 'in_progress', priority: 'high', assignedTo: alice.id, dueDate: days(5), labels: [labels.feature, labels.enhancement] },
    { projectId: mobileApp.id, title: 'Fix navigation header glitch', status: 'review', priority: 'urgent', assignedTo: bob.id, dueDate: days(1), labels: [labels.bug] },
    { projectId: mobileApp.id, title: 'Implement push notifications', status: 'todo', priority: 'medium', assignedTo: charlie.id, dueDate: days(10), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Optimize list rendering performance', status: 'backlog', priority: 'medium', assignedTo: null, dueDate: days(14), labels: [labels.enhancement] },
    { projectId: mobileApp.id, title: 'Add dark mode support', status: 'todo', priority: 'low', assignedTo: bob.id, dueDate: days(21), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Research camera API integration', status: 'in_progress', priority: 'low', assignedTo: charlie.id, dueDate: days(3), labels: [labels.research] },
    { projectId: mobileApp.id, title: 'Implement offline data sync', status: 'backlog', priority: 'high', assignedTo: null, dueDate: days(30), labels: [labels.feature, labels.enhancement] },
    { projectId: mobileApp.id, title: 'Build onboarding flow', status: 'todo', priority: 'medium', assignedTo: alice.id, dueDate: days(7), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Fix login screen keyboard handling', status: 'done', priority: 'urgent', assignedTo: alice.id, dueDate: days(-1), labels: [labels.bug] },
    { projectId: mobileApp.id, title: 'Add biometric authentication', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(45), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Implement in-app purchases', status: 'todo', priority: 'high', assignedTo: bob.id, dueDate: days(14), labels: [labels.feature] },
    { projectId: mobileApp.id, title: 'Setup CI/CD pipeline', status: 'done', priority: 'high', assignedTo: bob.id, dueDate: days(-7), labels: [labels.enhancement] },
    { projectId: mobileApp.id, title: 'Write unit tests for auth module', status: 'in_progress', priority: 'medium', assignedTo: charlie.id, dueDate: days(4), labels: [labels.enhancement] },
    { projectId: mobileApp.id, title: 'Design system color tokens', status: 'done', priority: 'medium', assignedTo: alice.id, dueDate: days(-10), labels: [] },
    { projectId: mobileApp.id, title: 'App icon and splash screen', status: 'todo', priority: 'low', assignedTo: charlie.id, dueDate: days(28), labels: [] },
    { projectId: mobileApp.id, title: 'Crash reporting integration', status: 'review', priority: 'high', assignedTo: bob.id, dueDate: days(2), labels: [labels.bug] },
    { projectId: mobileApp.id, title: 'Deep linking setup', status: 'backlog', priority: 'medium', assignedTo: null, dueDate: days(60), labels: [labels.feature] },
    { projectId: backendApi.id, title: 'Design REST API endpoints', status: 'done', priority: 'high', assignedTo: bob.id, dueDate: days(-14), labels: [] },
    { projectId: backendApi.id, title: 'Implement authentication middleware', status: 'done', priority: 'urgent', assignedTo: bob.id, dueDate: days(-5), labels: [] },
    { projectId: backendApi.id, title: 'Build task CRUD endpoints', status: 'in_progress', priority: 'high', assignedTo: bob.id, dueDate: days(3), labels: [] },
    { projectId: backendApi.id, title: 'Add rate limiting', status: 'todo', priority: 'medium', assignedTo: alice.id, dueDate: days(7), labels: [] },
    { projectId: backendApi.id, title: 'Database indexing strategy', status: 'review', priority: 'high', assignedTo: bob.id, dueDate: days(1), labels: [] },
    { projectId: backendApi.id, title: 'Implement WebSocket realtime updates', status: 'todo', priority: 'high', assignedTo: charlie.id, dueDate: days(10), labels: [] },
    { projectId: backendApi.id, title: 'Write API documentation', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(20), labels: [] },
    { projectId: backendApi.id, title: 'Data export endpoint', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(35), labels: [] },
    { projectId: backendApi.id, title: 'Search endpoint with full-text', status: 'todo', priority: 'medium', assignedTo: alice.id, dueDate: days(12), labels: [] },
    { projectId: backendApi.id, title: 'Attachment upload service', status: 'done', priority: 'medium', assignedTo: bob.id, dueDate: days(-2), labels: [] },
    { projectId: backendApi.id, title: 'Fix database connection pooling', status: 'done', priority: 'urgent', assignedTo: bob.id, dueDate: days(-8), labels: [] },
    { projectId: backendApi.id, title: 'Analytics aggregation queries', status: 'in_progress', priority: 'high', assignedTo: alice.id, dueDate: days(5), labels: [] },
    { projectId: backendApi.id, title: 'Notification service architecture', status: 'todo', priority: 'medium', assignedTo: charlie.id, dueDate: days(14), labels: [] },
    { projectId: backendApi.id, title: 'API versioning strategy', status: 'review', priority: 'low', assignedTo: alice.id, dueDate: days(-1), labels: [] },
    { projectId: backendApi.id, title: 'Error tracking integration', status: 'done', priority: 'medium', assignedTo: bob.id, dueDate: days(-6), labels: [] },
    { projectId: backendApi.id, title: 'Set up staging environment', status: 'in_progress', priority: 'high', assignedTo: alice.id, dueDate: days(2), labels: [] },
    { projectId: backendApi.id, title: 'Load testing scripts', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(30), labels: [] },
    { projectId: marketing.id, title: 'Homepage hero section', status: 'done', priority: 'high', assignedTo: alice.id, dueDate: days(-4), labels: [] },
    { projectId: marketing.id, title: 'Pricing page redesign', status: 'in_progress', priority: 'high', assignedTo: alice.id, dueDate: days(6), labels: [] },
    { projectId: marketing.id, title: 'SEO optimization audit', status: 'todo', priority: 'medium', assignedTo: charlie.id, dueDate: days(8), labels: [] },
    { projectId: marketing.id, title: 'Case studies section', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(20), labels: [] },
    { projectId: marketing.id, title: 'Contact form integration', status: 'done', priority: 'medium', assignedTo: bob.id, dueDate: days(-9), labels: [] },
    { projectId: marketing.id, title: 'Blog page with CMS', status: 'todo', priority: 'high', assignedTo: alice.id, dueDate: days(14), labels: [] },
    { projectId: marketing.id, title: 'Analytics tracking setup', status: 'in_progress', priority: 'medium', assignedTo: charlie.id, dueDate: days(3), labels: [] },
    { projectId: marketing.id, title: 'Mobile responsive fixes', status: 'review', priority: 'urgent', assignedTo: bob.id, dueDate: days(0), labels: [] },
    { projectId: marketing.id, title: 'A/B testing framework', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(45), labels: [] },
    { projectId: marketing.id, title: 'Newsletter signup widget', status: 'todo', priority: 'medium', assignedTo: charlie.id, dueDate: days(10), labels: [] },
    { projectId: marketing.id, title: 'Performance optimization', status: 'in_progress', priority: 'high', assignedTo: bob.id, dueDate: days(4), labels: [] },
    { projectId: marketing.id, title: 'Social media meta tags', status: 'done', priority: 'medium', assignedTo: alice.id, dueDate: days(-12), labels: [] },
    { projectId: marketing.id, title: 'Accessibility compliance audit', status: 'todo', priority: 'medium', assignedTo: charlie.id, dueDate: days(18), labels: [] },
    { projectId: marketing.id, title: 'FAQ page with accordion', status: 'backlog', priority: 'low', assignedTo: null, dueDate: days(30), labels: [] },
    { projectId: marketing.id, title: 'Customer testimonial carousel', status: 'review', priority: 'medium', assignedTo: alice.id, dueDate: days(-1), labels: [] },
    { projectId: marketing.id, title: 'Sitemap generation', status: 'done', priority: 'low', assignedTo: bob.id, dueDate: days(-15), labels: [] },
  ];

  for (const t of taskSeeds) {
    const completedAt = t.status === 'done' ? new Date(t.dueDate.getTime() + 86400000) : null;
    const task = await prisma.task.create({
      data: {
        projectId: t.projectId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        completedAt,
        position: 0,
        createdAt: new Date(t.dueDate.getTime() - 86400000 * 3),
      },
    });

    if (t.labels.length > 0) {
      await prisma.taskLabelAssignment.createMany({
        data: t.labels.map((label) => ({ taskId: task.id, labelId: label.id })),
      });
    }
  }

  console.log(`  ✅ ${taskSeeds.length} tasks created`);
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
