import { Router } from 'express';
import { getTheaters, getTheater, createTheater, updateTheater } from '../controllers/theater.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();

// Public
router.get('/', getTheaters);
router.get('/:id', getTheater);

// Admin only
router.post('/', authenticate, authorize('admin'), createTheater);
router.put('/:id', authenticate, authorize('admin'), updateTheater);

export default router;