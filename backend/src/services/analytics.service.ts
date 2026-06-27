import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { AuthzService } from './authz.service';

interface WorkspaceAnalytics {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completionPercent: number;
  tasksByPriority: { priority: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  recentActivity: { id: string; action: string; userId: string; userName: string; createdAt: Date }[];
  upcomingDeadlines: { id: string; title: string; dueDate: Date; projectId: string; projectName: string }[];
  insights: string[];
}

interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  velocity: number;
  completionTrend: { date: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
}

interface UserAnalytics {
  assignedTasks: number;
  completedThisWeek: number;
  completedThisMonth: number;
  overdueAssigned: number;
}

interface DashboardAnalytics {
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completionRate: number;
  productivityScore: number;
  weeklyTrend: { date: string; count: number }[];
  monthlyTrend: { date: string; count: number }[];
  upcomingDeadlines: { id: string; title: string; dueDate: Date; projectId: string; projectName: string }[];
  todayCompleted: number;
  todayCreated: number;
  totalTasks: number;
}

export class AnalyticsService {

  static async getDashboardAnalytics(userId: string, workspaceId?: string): Promise<DashboardAnalytics> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    let accessibleProjectIds: string[];
    if (workspaceId) {
      const projects = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      accessibleProjectIds = projects.map((p) => p.id);
    } else {
      const memberWorkspaces = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      });
      const workspaceIds = memberWorkspaces.map((m) => m.workspaceId);
      const accessibleProjects = await prisma.project.findMany({
        where: { workspaceId: { in: workspaceIds } },
        select: { id: true },
      });
      accessibleProjectIds = accessibleProjects.map((p) => p.id);
    }

    const taskWhere = { projectId: { in: accessibleProjectIds }, deletedAt: null } as const;

    const [
      totalTasks,
      statusGroups,
      overdueTasks,
      todayCompleted,
      todayCreated,
      currentWeekCompleted,
      prevWeekCompleted,
      upcomingTasks,
      projects,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: true }),
      prisma.task.count({ where: { ...taskWhere, dueDate: { lt: now }, status: { not: 'done' } } }),
      prisma.task.count({ where: { ...taskWhere, completedAt: { gte: dayStart } } }),
      prisma.task.count({ where: { ...taskWhere, createdAt: { gte: dayStart } } }),
      prisma.task.count({ where: { ...taskWhere, completedAt: { gte: weekStart } } }),
      prisma.task.count({ where: { ...taskWhere, completedAt: { gte: prevWeekStart, lt: weekStart } } }),
      prisma.task.findMany({
        where: { ...taskWhere, dueDate: { not: null }, status: { not: 'done' } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, title: true, dueDate: true, projectId: true },
      }),
      prisma.project.findMany({
        where: { id: { in: accessibleProjectIds } },
        select: { id: true, name: true },
      }),
    ]);

    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count]));
    const completedTasks = statusMap['done'] || 0;
    const activeTasks = totalTasks - completedTasks - (statusMap['backlog'] || 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const productivityScore = prevWeekCompleted > 0
      ? Math.round((currentWeekCompleted / prevWeekCompleted) * 100)
      : currentWeekCompleted > 0 ? 100 : 0;

    const weekLabels = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() - (7 - i) * 7);
      start.setHours(0, 0, 0, 0);
      return { start, label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    });

    const countByWeek = new Map<string, number>();
    if (accessibleProjectIds.length > 0) {
      const trendStart = weekLabels[0].start;
      const weeklyRows = await prisma.$queryRaw<Array<{ period: Date; count: bigint }>>`
        SELECT DATE_TRUNC('week', "completed_at")::date AS period, COUNT(*)::bigint AS count
        FROM "tasks"
        WHERE "project_id"::text IN (${Prisma.join(accessibleProjectIds)})
          AND "deleted_at" IS NULL
          AND "completed_at" IS NOT NULL
          AND "completed_at" >= ${trendStart}
        GROUP BY period ORDER BY period
      `;
      for (const row of weeklyRows) {
        countByWeek.set(row.period.toISOString().slice(0, 10), Number(row.count));
      }
    }
    const weeklyTrend = weekLabels.map(({ start, label }) => ({
      date: label,
      count: countByWeek.get(start.toISOString().slice(0, 10)) || 0,
    }));

    const monthLabels = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { start, label: start.toLocaleDateString('en-US', { month: 'short' }) };
    });

    const countByMonth = new Map<string, number>();
    if (accessibleProjectIds.length > 0) {
      const monthlyRows = await prisma.$queryRaw<Array<{ period: Date; count: bigint }>>`
        SELECT DATE_TRUNC('month', "completed_at")::date AS period, COUNT(*)::bigint AS count
        FROM "tasks"
        WHERE "project_id"::text IN (${Prisma.join(accessibleProjectIds)})
          AND "deleted_at" IS NULL
          AND "completed_at" IS NOT NULL
          AND "completed_at" >= ${monthLabels[0].start}
        GROUP BY period ORDER BY period
      `;
      for (const row of monthlyRows) {
        countByMonth.set(row.period.toISOString().slice(0, 7), Number(row.count));
      }
    }
    const monthlyTrend = monthLabels.map(({ start, label }) => ({
      date: label,
      count: countByMonth.get(start.toISOString().slice(0, 7)) || 0,
    }));

    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
    const upcomingDeadlines = upcomingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!,
      projectId: t.projectId,
      projectName: projectMap[t.projectId] || 'Unknown',
    }));

    return {
      completedTasks,
      activeTasks,
      overdueTasks,
      completionRate,
      productivityScore,
      weeklyTrend,
      monthlyTrend,
      upcomingDeadlines,
      todayCompleted,
      todayCreated,
      totalTasks,
    };
  }

  static async getWorkspaceAnalytics(workspaceId: string, userId: string): Promise<WorkspaceAnalytics> {
    await AuthzService.requireWorkspaceAccess(workspaceId, userId);
    const now = new Date();

    const projects = await prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true },
    });
    const projectIds = projects.map((p) => p.id);
    const taskWhere = { projectId: { in: projectIds }, deletedAt: null } as const;

    const [
      totalTasks,
      statusGroups,
      priorityGroups,
      overdueTasks,
      highPriorityCount,
      completedToday,
      upcomingTasks,
      recentLogs,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: true }),
      prisma.task.groupBy({ by: ['priority'], where: taskWhere, _count: true }),
      prisma.task.count({ where: { ...taskWhere, dueDate: { lt: now }, status: { not: 'done' } } }),
      prisma.task.count({ where: { ...taskWhere, priority: { in: ['high', 'urgent'] } } }),
      prisma.task.count({
        where: { ...taskWhere, completedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      }),
      prisma.task.findMany({
        where: { ...taskWhere, dueDate: { not: null }, status: { not: 'done' } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, title: true, dueDate: true, projectId: true },
      }),
      prisma.activityLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count]));
    const completedTasks = statusMap['done'] || 0;
    const activeTasks = totalTasks - completedTasks - (statusMap['backlog'] || 0);
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const tasksByPriority = priorityGroups
      .filter((g) => g.priority)
      .map((g) => ({ priority: g.priority, count: g._count }));
    const tasksByStatus = statusGroups.map((g) => ({ status: g.status, count: g._count }));

    const recentActivity = recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      userName: l.user.name,
      createdAt: l.createdAt,
    }));

    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
    const upcomingDeadlines = upcomingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!,
      projectId: t.projectId,
      projectName: projectMap[t.projectId] || 'Unknown',
    }));

    const insights: string[] = [];
    if (completedTasks > 0) insights.push(`You have completed ${completedTasks} tasks.`);
    if (overdueTasks > 0) insights.push(`You have ${overdueTasks} overdue tasks that need attention.`);
    if (completionPercent > 50) insights.push(`Overall completion rate is ${completionPercent}%. Good progress!`);
    else insights.push(`Overall completion rate is ${completionPercent}%. Keep pushing!`);
    if (highPriorityCount > 0) insights.push(`There are ${highPriorityCount} high priority tasks.`);
    if (completedToday > 0) insights.push(`You completed ${completedToday} tasks today.`);

    return {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      activeTasks,
      overdueTasks,
      completionPercent,
      tasksByPriority,
      tasksByStatus,
      recentActivity,
      upcomingDeadlines,
      insights,
    };
  }

  static async getProjectAnalytics(projectId: string, userId: string): Promise<ProjectAnalytics> {
    await AuthzService.requireProjectAccess(projectId, userId);
    const now = new Date();

    const taskWhere = { projectId, deletedAt: null } as const;

    const [
      totalTasks,
      completedTasks,
      statusGroups,
      priorityGroups,
      aggregation,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'done' } }),
      prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: true }),
      prisma.task.groupBy({ by: ['priority'], where: taskWhere, _count: true }),
      prisma.task.aggregate({ where: taskWhere, _min: { createdAt: true } }),
    ]);

    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const tasksByStatus = statusGroups.map((g) => ({ status: g.status, count: g._count }));
    const tasksByPriority = priorityGroups
      .filter((g) => g.priority)
      .map((g) => ({ priority: g.priority, count: g._count }));

    const weekLabels = Array.from({ length: 4 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() - (3 - i) * 7);
      start.setHours(0, 0, 0, 0);
      return { start, label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    });

    const countByWeek = new Map<string, number>();
    const trendStart = weekLabels[0].start;
    const weeklyRows = await prisma.$queryRaw<Array<{ period: Date; count: bigint }>>`
      SELECT DATE_TRUNC('week', "completed_at")::date AS period, COUNT(*)::bigint AS count
      FROM "tasks"
      WHERE "project_id"::text = ${projectId}
        AND "deleted_at" IS NULL
        AND "completed_at" IS NOT NULL
        AND "completed_at" >= ${trendStart}
      GROUP BY period ORDER BY period
    `;
    for (const row of weeklyRows) {
      countByWeek.set(row.period.toISOString().slice(0, 10), Number(row.count));
    }
    const completionTrend = weekLabels.map(({ start, label }) => ({
      date: label,
      count: countByWeek.get(start.toISOString().slice(0, 10)) || 0,
    }));

    const oldestCreatedAt = aggregation._min.createdAt;
    const daysSinceFirst = oldestCreatedAt
      ? Math.max(1, (now.getTime() - oldestCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    const velocity = Math.round(completedTasks / (daysSinceFirst / 7));

    return { totalTasks, completedTasks, completionPercent, velocity, completionTrend, tasksByStatus, tasksByPriority };
  }

  static async getUserAnalytics(userId: string, workspaceId?: string): Promise<UserAnalytics> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const taskWhere: any = { assignedTo: userId, deletedAt: null };
    if (workspaceId) {
      const projectIds = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      taskWhere.projectId = { in: projectIds.map((p) => p.id) };
    }

    const [assignedTasks, completedThisWeek, completedThisMonth, overdueAssigned] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'done', completedAt: { gte: weekStart } } }),
      prisma.task.count({ where: { ...taskWhere, status: 'done', completedAt: { gte: monthStart } } }),
      prisma.task.count({ where: { ...taskWhere, dueDate: { lt: now }, status: { not: 'done' } } }),
    ]);

    return { assignedTasks, completedThisWeek, completedThisMonth, overdueAssigned };
  }
}
