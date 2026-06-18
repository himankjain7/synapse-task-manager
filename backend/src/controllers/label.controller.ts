import { Request, Response } from 'express';
import { LabelService } from '../services/label.service';
import { asyncHandler } from '../middleware/error.middleware';

export class LabelController {
  static listLabels = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const labels = await LabelService.getProjectLabels(projectId);
    res.json({ success: true, data: labels, timestamp: new Date() });
  });

  static createLabel = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.createLabel(projectId, name, color || '#6366F1');
    res.status(201).json({ success: true, data: label, timestamp: new Date() });
  });

  static updateLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, color } = req.body;
    const label = await LabelService.updateLabel(id, name, color);
    res.json({ success: true, data: label, timestamp: new Date() });
  });

  static deleteLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await LabelService.deleteLabel(id);
    res.status(204).send();
  });

  static assignLabel = asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { labelId } = req.body;
    await LabelService.assignLabelToTask(taskId, labelId);
    res.json({ success: true, message: 'Label assigned', timestamp: new Date() });
  });

  static removeLabel = asyncHandler(async (req: Request, res: Response) => {
    const { taskId, labelId } = req.params;
    await LabelService.removeLabelFromTask(taskId, labelId);
    res.json({ success: true, message: 'Label removed', timestamp: new Date() });
  });
}
