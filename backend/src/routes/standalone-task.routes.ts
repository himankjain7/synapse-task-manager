import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateUUID,
  validateBody,
  sanitizeFields,
} from '../middleware/validation.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:id', validateUUID('id'), TaskController.getTask);
router.patch('/:id', validateUUID('id'), validateBody, sanitizeFields(['title', 'description']), TaskController.updateTask);
router.delete('/:id', validateUUID('id'), TaskController.deleteTask);

export default router;
