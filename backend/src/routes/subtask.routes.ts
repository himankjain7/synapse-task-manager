import { Router } from 'express';
import { SubtaskController } from '../controllers/subtask.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateUUID, validateBody, validateRequired } from '../middleware/validation.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', validateUUID('taskId'), SubtaskController.list);

router.post(
  '/',
  validateUUID('taskId'),
  validateBody,
  validateRequired(['title']),
  SubtaskController.create
);

router.patch(
  '/:subtaskId',
  validateUUID('subtaskId'),
  validateBody,
  SubtaskController.update
);

router.delete(
  '/:subtaskId',
  validateUUID('subtaskId'),
  SubtaskController.delete
);

export default router;
