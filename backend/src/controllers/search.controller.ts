import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { asyncHandler } from '../middleware/error.middleware';
import { APIError } from '../middleware/error.middleware';

export class SearchController {
  static search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    const query = req.query.q as string;
    if (!userId) throw new APIError(401, 'UNAUTHORIZED', 'Authentication required');
    if (!query || query.length < 2) {
      res.status(200).json({ success: true, data: { workspaces: [], projects: [], tasks: [], labels: [] }, timestamp: new Date() });
      return;
    }
    const results = await SearchService.global(query, userId);
    res.status(200).json({ success: true, data: results, timestamp: new Date() });
  });
}
