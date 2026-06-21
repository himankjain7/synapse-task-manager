import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', SearchController.search);

export default router;
