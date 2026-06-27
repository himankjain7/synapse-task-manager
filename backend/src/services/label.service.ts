import prisma from '../config/db';
import { ActivityService } from './activity.service';
import { AuthzService } from './authz.service';

export class LabelService {
  static async getProjectLabels(projectId: string, userId: string) {
    await AuthzService.requireProjectAccess(projectId, userId);
    return prisma.taskLabel.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  static async createLabel(projectId: string, name: string, color: string, userId: string) {
    await AuthzService.requireProjectAccess(projectId, userId);
    return prisma.taskLabel.create({
      data: { projectId, name, color },
    });
  }

  static async updateLabel(id: string, name: string, color: string, userId: string) {
    const label = await prisma.taskLabel.findUnique({ where: { id }, select: { projectId: true } });
    if (!label) throw new Error('Label not found');
    await AuthzService.requireProjectAccess(label.projectId, userId);
    return prisma.taskLabel.update({
      where: { id },
      data: { name, color },
    });
  }

  static async deleteLabel(id: string, userId: string) {
    const label = await prisma.taskLabel.findUnique({ where: { id }, select: { projectId: true } });
    if (!label) throw new Error('Label not found');
    await AuthzService.requireProjectAccess(label.projectId, userId);
    await prisma.taskLabelAssignment.deleteMany({ where: { labelId: id } });
    await prisma.taskLabel.delete({ where: { id } });
  }

  static async assignLabelToTask(taskId: string, labelId: string, userId: string) {
    await AuthzService.requireTaskAccess(taskId, userId);
    const [task, label] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, include: { project: true } }),
      prisma.taskLabel.findUnique({ where: { id: labelId } }),
    ]);

    const assignment = await prisma.taskLabelAssignment.create({
      data: { taskId, labelId },
    });

    if (task && label) {
      await ActivityService.log({
        workspaceId: task.project.workspaceId,
        taskId,
        userId,
        action: 'label_added',
        details: { label: label.name },
      });
    }

    return assignment;
  }

  static async removeLabelFromTask(taskId: string, labelId: string, userId: string) {
    await AuthzService.requireTaskAccess(taskId, userId);
    const [task, label] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, include: { project: true } }),
      prisma.taskLabel.findUnique({ where: { id: labelId } }),
    ]);

    await prisma.taskLabelAssignment.deleteMany({
      where: { taskId, labelId },
    });

    if (task && label) {
      await ActivityService.log({
        workspaceId: task.project.workspaceId,
        taskId,
        userId,
        action: 'label_removed',
        details: { label: label.name },
      });
    }
  }

  static async getTaskLabels(taskId: string) {
    const assignments = await prisma.taskLabelAssignment.findMany({
      where: { taskId },
      include: { label: true },
    });
    return assignments.map(a => a.label);
  }
}
