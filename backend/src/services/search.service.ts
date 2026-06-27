import prisma from '../config/db';

interface SearchResult {
  workspaces: { id: string; name: string; type: 'workspace' }[];
  projects: { id: string; name: string; workspaceId: string; type: 'project' }[];
  tasks: { id: string; title: string; projectId: string; status: string; type: 'task' }[];
  labels: { id: string; name: string; color: string; type: 'label' }[];
}

export class SearchService {
  static async global(query: string, userId: string, workspaceId?: string): Promise<SearchResult> {
    const filter = { contains: query, mode: 'insensitive' as const };

    let allWorkspaceIds: string[];
    if (workspaceId) {
      allWorkspaceIds = [workspaceId];
    } else {
      const memberWorkspaceIds = (
        await prisma.workspaceMember.findMany({
          where: { userId },
          select: { workspaceId: true },
        })
      ).map((m) => m.workspaceId);

      const ownedWorkspaceIds = (
        await prisma.workspace.findMany({
          where: { ownerId: userId },
          select: { id: true },
        })
      ).map((w) => w.id);

      allWorkspaceIds = [...new Set([...memberWorkspaceIds, ...ownedWorkspaceIds])];
    }

    const [workspaces, projects, tasks, labels] = await Promise.all([
      prisma.workspace.findMany({
        where: { id: { in: allWorkspaceIds }, name: filter, deletedAt: null },
        take: 5,
      }),
      prisma.project.findMany({
        where: { workspaceId: { in: allWorkspaceIds }, name: filter, deletedAt: null },
        take: 5,
      }),
      prisma.task.findMany({
        where: { project: { workspaceId: { in: allWorkspaceIds } }, title: filter, deletedAt: null },
        take: 10,
        include: { project: { select: { id: true } } },
      }),
      prisma.taskLabel.findMany({
        where: { project: { workspaceId: { in: allWorkspaceIds } }, name: filter },
        take: 5,
      }),
    ]);

    return {
      workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, type: 'workspace' as const })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, workspaceId: p.workspaceId, type: 'project' as const })),
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, projectId: t.project.id, status: t.status, type: 'task' as const })),
      labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color, type: 'label' as const })),
    };
  }
}
