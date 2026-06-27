import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

export class AnalyticsController {
  static getDashboardAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const workspaceId = req.query.workspaceId as string | undefined;
    const data = await AnalyticsService.getDashboardAnalytics(userId, workspaceId);
    sendSuccess(res, data);
  });

  static getWorkspaceAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { workspaceId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const data = await AnalyticsService.getWorkspaceAnalytics(workspaceId, userId);
    sendSuccess(res, data);
  });

  static getProjectAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const { projectId } = req.params;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const data = await AnalyticsService.getProjectAnalytics(projectId, userId);
    sendSuccess(res, data);
  });

  static getUserAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    const workspaceId = req.query.workspaceId as string | undefined;
    const data = await AnalyticsService.getUserAnalytics(userId, workspaceId);
    sendSuccess(res, data);
  });
}
