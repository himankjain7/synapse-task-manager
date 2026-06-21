"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const error_middleware_1 = require("../middleware/error.middleware");
const error_middleware_2 = require("../middleware/error.middleware");
class AnalyticsController {
    static getWorkspaceAnalytics = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { workspaceId } = req.params;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const data = await analytics_service_1.AnalyticsService.getWorkspaceAnalytics(workspaceId, userId);
        res.status(200).json({ success: true, data, timestamp: new Date() });
    });
    static getProjectAnalytics = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        const { projectId } = req.params;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const data = await analytics_service_1.AnalyticsService.getProjectAnalytics(projectId, userId);
        res.status(200).json({ success: true, data, timestamp: new Date() });
    });
    static getUserAnalytics = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const userId = req.auth?.userId;
        if (!userId)
            throw new error_middleware_2.APIError(401, 'UNAUTHORIZED', 'Authentication required');
        const data = await analytics_service_1.AnalyticsService.getUserAnalytics(userId);
        res.status(200).json({ success: true, data, timestamp: new Date() });
    });
}
exports.AnalyticsController = AnalyticsController;
