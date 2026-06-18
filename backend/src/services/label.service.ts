import prisma from '../config/db';

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

  static async assignLabelToTask(taskId: string, labelId: string) {
    return prisma.taskLabelAssignment.create({
      data: { taskId, labelId },
    });
  }

  static async removeLabelFromTask(taskId: string, labelId: string) {
    await prisma.taskLabelAssignment.deleteMany({
      where: { taskId, labelId },
    });
  }

  static async getTaskLabels(taskId: string) {
    const assignments = await prisma.taskLabelAssignment.findMany({
      where: { taskId },
      include: { label: true },
    });
    return assignments.map(a => a.label);
  }
}
