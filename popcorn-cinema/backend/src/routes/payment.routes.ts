import { Router } from 'express';
import { authenticate } from '../middleware/errorHandler';
import {
  initiatePayment, confirmPayment,
  adminConfirmPayment, adminRejectPayment,
  getPendingPayments, getPaymentStatus, getPayment,
} from '../controllers/payment.controller';

const router = Router();

router.post('/initiate', authenticate, initiatePayment);
router.post('/confirm', authenticate, confirmPayment);
router.post('/admin-confirm', authenticate, adminConfirmPayment);
router.post('/admin-reject', authenticate, adminRejectPayment);
router.get('/pending', authenticate, getPendingPayments);
router.get('/status/:transactionId', authenticate, getPaymentStatus);
router.get('/:id', authenticate, getPayment);

export default router;