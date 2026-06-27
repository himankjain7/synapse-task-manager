import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  console.log(`  ${label}: ${ms.toFixed(2)}ms`);
  return result;
}

async function benchmark() {
  console.log('\n=== Analytics Performance Benchmark ===\n');
  console.log(`Database: PostgreSQL via Prisma`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Get a sample user
  const users = await prisma.user.findMany({ take: 1, select: { id: true } });
  if (users.length === 0) {
    console.log('No users found. Run seed first.\n');
    await prisma.$disconnect();
    return;
  }
  const userId = users[0].id;

  // Get sample workspace
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    take: 1,
    select: { workspaceId: true },
  });
  if (memberships.length === 0) {
    console.log('User has no workspaces.\n');
    await prisma.$disconnect();
    return;
  }
  const workspaceId = memberships[0].workspaceId;

  // Get sample project
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    take: 1,
    select: { id: true },
  });
  if (projects.length === 0) {
    console.log('Workspace has no projects.\n');
    await prisma.$disconnect();
    return;
  }
  const projectId = projects[0].id;

  // Count total tasks in system
  const totalTasks = await prisma.task.count();
  const userTasks = await prisma.task.count({
    where: { project: { workspace: { members: { some: { userId } } } }, deletedAt: null },
  });
  console.log(`Total tasks in DB: ${totalTasks}`);
  console.log(`Accessible tasks for user: ${userTasks}\n`);

  console.log('--- Benchmark: getDashboardAnalytics ---');
  await time('Full execution', async () => {
    const { AnalyticsService } = await import('../src/services/analytics.service');
    await AnalyticsService.getDashboardAnalytics(userId);
  });

  console.log('\n--- Benchmark: getWorkspaceAnalytics ---');
  await time('Full execution', async () => {
    const { AnalyticsService } = await import('../src/services/analytics.service');
    await AnalyticsService.getWorkspaceAnalytics(workspaceId, userId);
  });

  console.log('\n--- Benchmark: getProjectAnalytics ---');
  await time('Full execution', async () => {
    const { AnalyticsService } = await import('../src/services/analytics.service');
    await AnalyticsService.getProjectAnalytics(projectId, userId);
  });

  console.log('\n--- Benchmark: getUserAnalytics ---');
  await time('Full execution', async () => {
    const { AnalyticsService } = await import('../src/services/analytics.service');
    await AnalyticsService.getUserAnalytics(userId);
  });

  // Print query count estimates from Prisma
  console.log('\n--- Query Complexity ---');
  console.log('Dashboard: 1 (workspaceMembers) + 1 (projects) + ~6 count/queries + 2 raw SQL trend + 1 upcoming = ~11 queries');
  console.log('Workspace:  1 (projects) + ~7 count/queries + 1 activity = ~9 queries');
  console.log('Project:    ~6 count/queries + 1 raw SQL trend + 1 aggregate = ~8 queries');
  console.log('User:       4 count queries = 4 queries');

  await prisma.$disconnect();
  console.log('\nDone. Run `npx ts-node scripts/benchmark-analytics.ts` to re-run.\n');
}

benchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  prisma.$disconnect();
});
