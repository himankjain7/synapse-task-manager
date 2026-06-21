"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const db_1 = __importDefault(require("../config/db"));
class SearchService {
    static async global(query, userId) {
        const filter = { contains: query, mode: 'insensitive' };
        const memberWorkspaceIds = (await db_1.default.workspaceMember.findMany({
            where: { userId },
            select: { workspaceId: true },
        })).map((m) => m.workspaceId);
        const ownedWorkspaceIds = (await db_1.default.workspace.findMany({
            where: { ownerId: userId },
            select: { id: true },
        })).map((w) => w.id);
        const allWorkspaceIds = [...new Set([...memberWorkspaceIds, ...ownedWorkspaceIds])];
        const [workspaces, projects, tasks, labels] = await Promise.all([
            db_1.default.workspace.findMany({
                where: { id: { in: allWorkspaceIds }, name: filter, deletedAt: null },
                take: 5,
            }),
            db_1.default.project.findMany({
                where: { workspaceId: { in: allWorkspaceIds }, name: filter, deletedAt: null },
                take: 5,
            }),
            db_1.default.task.findMany({
                where: { project: { workspaceId: { in: allWorkspaceIds } }, title: filter, deletedAt: null },
                take: 10,
                include: { project: { select: { id: true } } },
            }),
            db_1.default.taskLabel.findMany({
                where: { project: { workspaceId: { in: allWorkspaceIds } }, name: filter },
                take: 5,
            }),
        ]);
        return {
            workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, type: 'workspace' })),
            projects: projects.map((p) => ({ id: p.id, name: p.name, workspaceId: p.workspaceId, type: 'project' })),
            tasks: tasks.map((t) => ({ id: t.id, title: t.title, projectId: t.project.id, status: t.status, type: 'task' })),
            labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color, type: 'label' })),
        };
    }
}
exports.SearchService = SearchService;
