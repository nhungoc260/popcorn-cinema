import { Request, Response } from 'express';
import { Theater, Room } from '../models';
import { AuthRequest } from '../middleware/errorHandler';

// GET /theaters
export async function getTheaters(req: Request, res: Response) {
  try {
    const theaters = await Theater.find({ isActive: true }).lean();
    return res.json({ success: true, data: theaters });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /theaters/:id
export async function getTheater(req: Request, res: Response) {
  try {
    const theater = await Theater.findById(req.params.id).lean();
    if (!theater) return res.status(404).json({ success: false, message: 'Không tìm thấy rạp' });
    const rooms = await Room.find({ theater: req.params.id, isActive: true }).lean();
    return res.json({ success: true, data: { theater, rooms } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /theaters (admin)
export async function createTheater(req: AuthRequest, res: Response) {
  try {
    const theater = await Theater.create(req.body);
    return res.status(201).json({ success: true, data: theater });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /theaters/:id (admin)
export async function updateTheater(req: AuthRequest, res: Response) {
  try {
    const theater = await Theater.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!theater) return res.status(404).json({ success: false, message: 'Không tìm thấy rạp' });
    return res.json({ success: true, data: theater });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}