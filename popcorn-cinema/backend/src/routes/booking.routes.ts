import { Router } from 'express';
import { createBooking, getMyBookings, getBooking, cancelBooking, checkIn } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);
router.post('/checkin', authorize('staff', 'admin'), checkIn);

export default router;