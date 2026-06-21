"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const search_service_1 = require("../services/search.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
class SearchController {
    static search = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const query = req.query.q;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        if (!query || query.length < 2) {
            res.status(200).json({ success: true, data: { workspaces: [], projects: [], tasks: [], labels: [] }, timestamp: new Date() });
            return;
        }
        const results = await search_service_1.SearchService.global(query, userId);
        res.status(200).json({ success: true, data: results, timestamp: new Date() });
    });
}
exports.SearchController = SearchController;
