import prisma from '../config/db';
import { ActivityService } from './activity.service';

export class LabelService {
  static async getProjectLabels(projectId: string) {
    return prisma.taskLabel.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  static async createLabel(projectId: string, name: string, color: string) {
    return prisma.taskLabel.create({
      data: { projectId, name, color },
    });
  }

  static async updateLabel(id: string, name: string, color: string) {
    return prisma.taskLabel.update({
      where: { id },
      data: { name, color },
    });
  }

  static async deleteLabel(id: string) {
    await prisma.taskLabelAssignment.deleteMany({ where: { labelId: id } });
    await prisma.taskLabel.delete({ where: { id } });
  }

  static async assignLabelToTask(taskId: string, labelId: string, userId: string) {
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
