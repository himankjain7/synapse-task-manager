import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

export class SearchController {
  static search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const query = req.query.q as string;
    const workspaceId = req.query.workspaceId as string | undefined;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    if (!query || query.length < 2) {
      sendSuccess(res, { workspaces: [], projects: [], tasks: [], labels: [] });
      return;
    }
    const results = await SearchService.global(query, userId, workspaceId);
    sendSuccess(res, results);
  });
}
