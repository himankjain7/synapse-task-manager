import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';

export class AnalyticsController {
  static getWorkspaceAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const data = await AnalyticsService.getWorkspaceAnalytics(workspaceId, userId);
    res.status(200).json({ success: true, data, timestamp: new Date() });
  });

  static getProjectAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { projectId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const data = await AnalyticsService.getProjectAnalytics(projectId, userId);
    res.status(200).json({ success: true, data, timestamp: new Date() });
  });

  static getUserAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const data = await AnalyticsService.getUserAnalytics(userId);
    res.status(200).json({ success: true, data, timestamp: new Date() });
  });
}
