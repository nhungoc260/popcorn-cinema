import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { Booking, Showtime, Seat } from '../models';
import { AuthRequest } from '../middleware/errorHandler';
import { lockSeats, releaseSeats, getSeatLockOwner } from '../config/redis';

// POST /bookings
export async function createBooking(req: AuthRequest, res: Response) {
  try {
    const { showtimeId, seatIds } = req.body;
    const userId = req.user!.id;

    if (!showtimeId || !seatIds?.length) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin suất chiếu hoặc ghế' });
    }

    const showtime = await Showtime.findById(showtimeId).populate('room');
    if (!showtime) return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });

    const room = showtime.room as any;
    let allSeats: any[] = room.seats || [];
    if (allSeats.length === 0) {
      allSeats = await Seat.find({ room: room._id }).lean();
    }

    const selectedSeats = allSeats.filter((s: any) => seatIds.includes(s._id.toString()));
    if (selectedSeats.length !== seatIds.length) {
      return res.status(400).json({ success: false, message: 'Một hoặc nhiều ghế không hợp lệ' });
    }

    const bookedSeatIds = (showtime.bookedSeats || []).map((id: any) => id.toString());
    const conflictSeats = selectedSeats.filter((s: any) => bookedSeatIds.includes(s._id.toString()));
    if (conflictSeats.length > 0) {
      return res.status(409).json({ success: false, message: 'Một hoặc nhiều ghế đã được đặt' });
    }

    await lockSeats(showtimeId, userId, seatIds);

    const totalAmount = selectedSeats.reduce((sum: number, s: any) =>
      sum + (s.price || 85000), 0);

    const bookingCode = `PC${Date.now().toString(36).toUpperCase()}`;
    const qrCode = await QRCode.toDataURL(bookingCode);
    const seatLabels = selectedSeats.map((s: any) => s.label || `${s.row}${s.number || s.col}`);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const booking = await Booking.create({
      user: userId,
      showtime: showtimeId,
      seats: seatIds,
      seatLabels,
      totalAmount,
      bookingCode,
      qrCode,
      status: 'pending',
      expiresAt,
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /bookings/my
export async function getMyBookings(req: AuthRequest, res: Response) {
  try {
    const bookings = await Booking.find({ user: req.user!.id })
      .populate({ path: 'showtime', populate: [
        { path: 'movie', select: 'title poster duration' },
        { path: 'theater', select: 'name city' },
        { path: 'room', select: 'name' }
      ]})
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: bookings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /bookings/:id
export async function getBooking(req: AuthRequest, res: Response) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'showtime', populate: [
        { path: 'movie', select: 'title poster duration' },
        { path: 'theater', select: 'name city address' },
        { path: 'room', select: 'name' }
      ]});
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    return res.json({ success: true, data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /bookings/:id/cancel
export async function cancelBooking(req: AuthRequest, res: Response) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    if (booking.status === 'confirmed') return res.status(400).json({ success: false, message: 'Không thể hủy vé đã thanh toán' });

    booking.status = 'cancelled';
    await booking.save();
    await releaseSeats(booking.showtime.toString(), req.user!.id);

    return res.json({ success: true, message: 'Đã hủy vé' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /bookings/checkin
export async function checkIn(req: AuthRequest, res: Response) {
  try {
    const { bookingCode } = req.body;
    if (!bookingCode) return res.status(400).json({ success: false, message: 'Thiếu mã vé' });

    const booking = await Booking.findOne({ bookingCode: bookingCode.trim().toUpperCase() })
      .populate({ path: 'showtime', populate: [
        { path: 'movie', select: 'title poster duration' },
        { path: 'theater', select: 'name city' },
        { path: 'room', select: 'name' }
      ]})
      .populate('user', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: `Không tìm thấy vé: ${bookingCode}` });

    if (booking.status === 'checked_in') {
      return res.status(400).json({ success: false, message: 'Vé này đã được check-in rồi', data: booking });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Vé chưa thanh toán hoặc đã bị hủy', data: booking });
    }

    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    await booking.save();

    return res.json({ success: true, message: '✅ Check-in thành công!', data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}