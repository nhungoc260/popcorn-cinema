import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initSocket } from './socket/socketServer';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import movieRoutes from './routes/movie.routes';
import theaterRoutes from './routes/theater.routes';
import showtimeRoutes from './routes/showtime.routes';

const app = express();
const server = http.createServer(app);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/movies`, movieRoutes);
app.use(`${API}/theaters`, theaterRoutes);
app.use(`${API}/showtimes`, showtimeRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`\n🎬 Popcorn Cinema API → http://localhost:${PORT}`);
      console.log(`📡 WebSocket ready`);
      console.log(`🏥 Health check      → http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
export { server };