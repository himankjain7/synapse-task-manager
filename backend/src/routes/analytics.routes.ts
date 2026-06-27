import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', AnalyticsController.getDashboardAnalytics);
router.get('/workspaces/:workspaceId', AnalyticsController.getWorkspaceAnalytics);
router.get('/projects/:projectId', AnalyticsController.getProjectAnalytics);
router.get('/user', AnalyticsController.getUserAnalytics);

export default router;
