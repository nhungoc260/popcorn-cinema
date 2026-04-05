import { Request, Response } from 'express';
import { Showtime, Seat } from '../models';

// GET /showtimes?movieId=&date=&theaterId=
export async function getShowtimes(req: Request, res: Response) {
  try {
    const { movieId, date, theaterId } = req.query;
    const filter: any = { isActive: true };
    if (movieId) filter.movie = movieId;
    if (theaterId) filter.theater = theaterId;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.startTime = { $gte: d, $lt: next };
    }

    const showtimes = await Showtime.find(filter)
      .populate('movie', 'title poster duration genres rating')
      .populate('theater', 'name city address')
      .populate('room', 'name totalSeats')
      .sort({ startTime: 1 })
      .lean();

    const data = showtimes.map((st: any) => ({
      ...st,
      availableSeats: (st.room?.totalSeats || 0) - (st.bookedSeats?.length || 0),
    }));

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /showtimes/:id
export async function getShowtime(req: Request, res: Response) {
  try {
    const st = await Showtime.findById(req.params.id)
      .populate('movie', 'title poster duration genres rating')
      .populate('theater', 'name city address')
      .populate('room', 'name totalSeats seats')
      .lean();
    if (!st) return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });
    return res.json({ success: true, data: st });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /showtimes/:id/seats
export async function getShowtimeSeats(req: Request, res: Response) {
  try {
    const st = await Showtime.findById(req.params.id)
      .populate('room', 'seats totalSeats name')
      .lean() as any;
    if (!st) return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });

    const bookedIds = new Set((st.bookedSeats || []).map((id: any) => id.toString()));
    const lockedSeats = st.lockedSeats || [];
    const rawSeats: any[] = st.room?.seats || [];

    const seats = rawSeats
      .filter((seat: any) => seat.type !== 'aisle')
      .map((seat: any) => {
        const isBooked = bookedIds.has(seat._id.toString());
        const lockedEntry = lockedSeats.find((l: any) => l.seatId?.toString() === seat._id.toString());
        const status = isBooked ? 'booked' : lockedEntry ? 'locked' : 'available';
        return {
          _id: seat._id,
          row: seat.row,
          col: seat.number || seat.col || 0,
          number: seat.number || seat.col || 0,
          label: seat.label || `${seat.row}${seat.number}`,
          type: seat.type || 'standard',
          status,
          price: seat.type === 'vip' ? st.priceVip : st.priceStandard || st.basePrice,
          lockedBy: lockedEntry?.userId || null,
        };
      });

    return res.json({ success: true, data: seats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /admin/showtimes
export async function createShowtime(req: Request, res: Response) {
  try {
    const st = await Showtime.create(req.body);
    return res.status(201).json({ success: true, data: st });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /admin/showtimes/:id
export async function deleteShowtime(req: Request, res: Response) {
  try {
    await Showtime.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ success: true, message: 'Đã xóa suất chiếu' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}