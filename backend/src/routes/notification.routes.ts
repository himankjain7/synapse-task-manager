import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateUUID, validatePagination } from '../middleware/validation.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', validatePagination, NotificationController.list);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', validateUUID('id'), NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);
router.delete('/:id', validateUUID('id'), NotificationController.delete);
router.delete('/clear/all', NotificationController.clearAll);

export default router;
