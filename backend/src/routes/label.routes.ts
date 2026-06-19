import { Router } from 'express';
import { LabelController } from '../controllers/label.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/labels', LabelController.listLabels);
router.post('/labels', LabelController.createLabel);
router.patch('/labels/:id', LabelController.updateLabel);
router.delete('/labels/:id', LabelController.deleteLabel);

router.post('/:taskId/labels', LabelController.assignLabel);
router.delete('/:taskId/labels/:labelId', LabelController.removeLabel);

export default router;
