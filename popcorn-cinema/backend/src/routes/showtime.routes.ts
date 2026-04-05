import { Router } from 'express';
import { getShowtimes, getShowtime, getShowtimeSeats, createShowtime, deleteShowtime } from '../controllers/showtime.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();

// Public
router.get('/', getShowtimes);
router.get('/:id', getShowtime);
router.get('/:id/seats', getShowtimeSeats);

// Admin only
router.post('/', authenticate, authorize('admin'), createShowtime);
router.delete('/:id', authenticate, authorize('admin'), deleteShowtime);

export default router;