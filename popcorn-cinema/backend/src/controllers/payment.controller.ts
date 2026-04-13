import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Payment, Booking, Showtime } from '../models';
import { AuthRequest } from '../middleware/errorHandler';
import { unlockAllUserSeats } from '../config/redis';
import { getIO } from '../socket/socketServer';

// POST /payments/initiate
export async function initiatePayment(req: AuthRequest, res: Response) {
  try {
    const { bookingId, method } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    if (booking.status === 'confirmed') return res.status(400).json({ success: false, message: 'Vé đã thanh toán' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Vé đã bị hủy' });

    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['pending', 'pending_confirmation', 'customer_confirmed'] }
    });
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        data: {
          payment: existingPayment,
          qrData: existingPayment.qrData,
          transactionId: existingPayment.transactionId,
          requiresConfirmation: true,
        }
      });
    }

    const transactionId = `TXN_${uuidv4().split('-')[0].toUpperCase()}`;
    let qrData = '';

    if (method === 'vietqr') {
      qrData = await QRCode.toDataURL(
        `https://vietqr.io/pay?bank=VCB&acc=1036219239&amount=${booking.totalAmount}&note=POPCORN_${booking.bookingCode}`
      );
    } else if (method === 'bank') {
      qrData = await QRCode.toDataURL(
        `STK:1036219239|NH:Vietcombank|ST:${booking.totalAmount}|ND:POPCORN ${booking.bookingCode}`
      );
    } else if (method === 'momo') {
      qrData = await QRCode.toDataURL(
        `momo://pay?amount=${booking.totalAmount}&note=POPCORN_${booking.bookingCode}&txnId=${transactionId}`
      );
    }

    const payment = await Payment.create({
      booking: bookingId,
      user: booking.user,
      amount: booking.totalAmount,
      method,
      transactionId,
      qrData,
      status: method === 'cash' ? 'pending' : 'pending_confirmation',
    });

    booking.status = 'pending_payment' as any;
    await booking.save();

    return res.status(201).json({
      success: true,
      data: { payment, qrData, transactionId, requiresConfirmation: method !== 'cash' }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/confirm — khách bấm "Đã chuyển khoản"
export async function confirmPayment(req: AuthRequest, res: Response) {
  try {
    const { transactionId } = req.body;
    const payment = await Payment.findOne({ transactionId });
    if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });

    payment.status = 'customer_confirmed' as any;
    await payment.save();

    return res.json({ success: true, message: 'Đã ghi nhận! Nhân viên sẽ xác nhận trong vài phút.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/admin-confirm — Admin/Staff xác nhận
export async function adminConfirmPayment(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được xác nhận' });
    }

    const { paymentId, transactionId } = req.body;
    const payment = await Payment.findOne(paymentId ? { _id: paymentId } : { transactionId });
    if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    if (payment.status === 'success') return res.status(400).json({ success: false, message: 'Đã xác nhận rồi' });

    // Xác nhận thanh toán
    payment.status = 'success';
    payment.paidAt = new Date();
    await payment.save();

    // Cập nhật booking
    const booking = await Booking.findById(payment.booking);
    if (!booking) throw new Error('Booking not found');
    booking.status = 'confirmed';
    booking.paymentId = payment._id as any;
    await booking.save();

    // Cập nhật ghế đã đặt trong Showtime
    await Showtime.findByIdAndUpdate(booking.showtime, {
      $addToSet: { bookedSeats: { $each: booking.seats } }
    });

    // Giải phóng lock ghế trong Redis
    await unlockAllUserSeats(booking.showtime.toString(), booking.user.toString());

    // Emit socket
    const io = getIO();
    io.to(`showtime:${booking.showtime}`).emit('seats:booked', {
      seatIds: booking.seats.map((s: any) => s.toString()),
      showtimeId: booking.showtime.toString(),
    });
    io.to(`user:${booking.user}`).emit('payment:confirmed', {
      transactionId: payment.transactionId,
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
    });

    return res.json({ success: true, message: '✅ Xác nhận thanh toán thành công!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/admin-reject — Admin/Staff từ chối
export async function adminRejectPayment(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được từ chối' });
    }

    const { paymentId, reason } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });

    payment.status = 'failed' as any;
    payment.rejectReason = reason || 'Admin từ chối';
    await payment.save();

    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.status = 'pending' as any;
      await booking.save();
    }

    getIO().to(`user:${payment.user}`).emit('payment:rejected', {
      transactionId: payment.transactionId,
      reason: payment.rejectReason,
    });

    return res.json({ success: true, message: '❌ Đã từ chối thanh toán' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/pending — Danh sách chờ xác nhận
export async function getPendingPayments(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payments = await Payment.find({
      status: { $in: ['pending_confirmation', 'customer_confirmed'] },
      method: { $in: ['bank', 'vietqr', 'momo'] },
    })
      .populate({ path: 'booking', populate: { path: 'showtime', populate: { path: 'movie', select: 'title' } } })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: payments });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/status/:transactionId
export async function getPaymentStatus(req: AuthRequest, res: Response) {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.transactionId }).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: { status: payment.status, method: payment.method } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/:id
export async function getPayment(req: AuthRequest, res: Response) {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: payment });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}