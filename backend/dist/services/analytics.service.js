"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const db_1 = __importDefault(require("../config/db"));
const project_service_1 = require("./project.service");
class AnalyticsService {
    static async getWorkspaceAnalytics(workspaceId, userId) {
        const canAccess = await project_service_1.ProjectService.canAccessProject(workspaceId, userId);
        if (!canAccess) {
            const memberCheck = await db_1.default.workspaceMember.findFirst({
                where: { workspaceId, userId },
            });
            if (!memberCheck)
                throw new Error('Access denied');
        }
        const projects = await db_1.default.project.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true },
        });
        const projectIds = projects.map((p) => p.id);
        const tasks = await db_1.default.task.findMany({
            where: { projectId: { in: projectIds }, deletedAt: null },
            select: { id: true, status: true, priority: true, dueDate: true, title: true, projectId: true, completedAt: true },
        });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'done').length;
        const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'backlog').length;
        const now = new Date();
        const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== 'done').length;
        const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const priorityCounts = {};
        const statusCounts = {};
        for (const t of tasks) {
            priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        }
        const tasksByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }));
        const tasksByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
        const recentLogs = await db_1.default.activityLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: { select: { id: true, name: true } } },
        });
        const recentActivity = recentLogs.map((l) => ({
            id: l.id,
            action: l.action,
            userId: l.userId,
            userName: l.user.name,
            createdAt: l.createdAt,
        }));
        const upcomingDeadlines = tasks
            .filter((t) => t.dueDate && t.status !== 'done')
            .sort((a, b) => (a.dueDate.getTime() - b.dueDate.getTime()))
            .slice(0, 5)
            .map((t) => {
            const proj = projects.find((p) => p.id === t.projectId);
            return { id: t.id, title: t.title, dueDate: t.dueDate, projectId: t.projectId, projectName: proj?.name || 'Unknown' };
        });
        const insights = [];
        if (completedTasks > 0)
            insights.push(`You have completed ${completedTasks} tasks.`);
        if (overdueTasks > 0)
            insights.push(`You have ${overdueTasks} overdue tasks that need attention.`);
        if (completionPercent > 50)
            insights.push(`Overall completion rate is ${completionPercent}%. Good progress!`);
        else
            insights.push(`Overall completion rate is ${completionPercent}%. Keep pushing!`);
        const highPriority = tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
        if (highPriority > 0)
            insights.push(`There are ${highPriority} high priority tasks.`);
        const completedToday = tasks.filter((t) => t.completedAt && t.completedAt.toDateString() === now.toDateString()).length;
        if (completedToday > 0)
            insights.push(`You completed ${completedToday} tasks today.`);
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
    static async getProjectAnalytics(projectId, userId) {
        const canAccess = await project_service_1.ProjectService.canAccessProject(projectId, userId);
        if (!canAccess)
            throw new Error('Access denied');
        const tasks = await db_1.default.task.findMany({
            where: { projectId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
        });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'done').length;
        const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const statusCounts = {};
        const priorityCounts = {};
        for (const t of tasks) {
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
            priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
        }
        const tasksByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
        const tasksByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }));
        const weeks = 4;
        const now = new Date();
        const completionTrend = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const start = new Date(now);
            start.setDate(start.getDate() - start.getDay() - i * 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            const count = tasks.filter((t) => t.completedAt && t.completedAt >= start && t.completedAt < end).length;
            const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            completionTrend.push({ date: label, count });
        }
        const oldestTask = tasks.length > 0 ? tasks[0].createdAt : now;
        const daysSinceFirst = Math.max(1, (now.getTime() - oldestTask.getTime()) / (1000 * 60 * 60 * 24));
        const velocity = Math.round(completedTasks / (daysSinceFirst / 7));
        return { totalTasks, completedTasks, completionPercent, velocity, completionTrend, tasksByStatus, tasksByPriority };
    }
    static async getUserAnalytics(userId) {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [assignedTasks, completedThisWeek, completedThisMonth, overdueAssigned] = await Promise.all([
            db_1.default.task.count({ where: { assignedTo: userId, deletedAt: null } }),
            db_1.default.task.count({ where: { assignedTo: userId, status: 'done', completedAt: { gte: weekStart }, deletedAt: null } }),
            db_1.default.task.count({ where: { assignedTo: userId, status: 'done', completedAt: { gte: monthStart }, deletedAt: null } }),
            db_1.default.task.count({ where: { assignedTo: userId, dueDate: { lt: now }, status: { not: 'done' }, deletedAt: null } }),
        ]);
        return { assignedTasks, completedThisWeek, completedThisMonth, overdueAssigned };
    }
}
exports.AnalyticsService = AnalyticsService;
