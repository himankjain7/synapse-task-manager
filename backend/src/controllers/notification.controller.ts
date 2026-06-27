import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler, APIError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

export class NotificationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const result = await NotificationService.getNotifications(userId, { page, limit, unreadOnly });
    sendSuccess(res, result);
  });

  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    const count = await NotificationService.getUnreadCount(userId);
    sendSuccess(res, { count });
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    const { id } = req.params;
    await NotificationService.markAsRead(id, userId);
    sendSuccess(res, null);
  });

  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    await NotificationService.markAllAsRead(userId);
    sendSuccess(res, null);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    const { id } = req.params;
    const deleted = await NotificationService.deleteNotification(id, userId);
    if (!deleted) {
      sendSuccess(res, null);
      return;
    }
    res.status(204).send();
  });

  static clearAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');

    await NotificationService.clearAll(userId);
    res.status(204).send();
  });
}
