import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { lockSeat, unlockSeat, getSeatLockOwner } from '../config/redis';

let io: Server;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string };
      (socket as any).userId = decoded.id;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;

    // Join showtime room
    socket.on('join:showtime', (showtimeId: string) => {
      socket.join(`showtime:${showtimeId}`);
    });

    socket.on('leave:showtime', (showtimeId: string) => {
      socket.leave(`showtime:${showtimeId}`);
    });

    // Select seat → lock → notify others
    socket.on('seat:select', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const locked = await lockSeat(showtimeId, seatId, userId);
        if (locked) {
          io.to(`showtime:${showtimeId}`).emit('seat:locked', { seatId, userId, showtimeId });
          socket.emit('seat:select:ok', { seatId });
        } else {
          const owner = await getSeatLockOwner(showtimeId, seatId);
          socket.emit('seat:select:fail', { seatId, reason: 'Ghế đã được người khác chọn', lockedBy: owner });
        }
      } catch {
        socket.emit('seat:select:fail', { seatId, reason: 'Server error' });
      }
    });

    // Deselect seat → unlock → notify others
    socket.on('seat:deselect', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const released = await unlockSeat(showtimeId, seatId, userId);
        if (released) {
          io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
        }
      } catch {}
    });

    socket.on('disconnect', () => {});
  });

  console.log('✅ Socket.io initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}