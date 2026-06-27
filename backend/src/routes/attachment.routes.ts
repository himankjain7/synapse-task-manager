import { Router } from 'express';
import { AttachmentController } from '../controllers/attachment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', AttachmentController.list);
router.post('/', upload.single('file'), AttachmentController.upload);
router.delete('/:id', AttachmentController.delete);

export default router;
