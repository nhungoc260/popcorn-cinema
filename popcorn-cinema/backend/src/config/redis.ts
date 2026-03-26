import Redis from 'ioredis';

let redis: Redis | null = null;
let redisAvailable = false;

const memStore = new Map<string, { value: string; expiresAt: number }>();

function memSet(key: string, value: string, ttlSeconds: number): boolean {
  const existing = memStore.get(key);
  if (existing && existing.expiresAt > Date.now()) return false;
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}
function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) { memStore.delete(key); return null; }
  return entry.value;
}
function memDel(key: string): void { memStore.delete(key); }
function memKeys(prefix: string): string[] {
  const now = Date.now();
  return [...memStore.entries()]
    .filter(([k, v]) => k.startsWith(prefix) && v.expiresAt > now)
    .map(([k]) => k);
}

export async function connectRedis(): Promise<void> {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {});
    await redis.connect();
    await redis.ping();
    redisAvailable = true;
    console.log('Redis connected');
  } catch {
    redis = null;
    redisAvailable = false;
    console.warn('Redis không khả dụng → dùng in-memory');
  }
}

export async function lockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
  const key = `seat_lock:${showtimeId}:${seatId}`;
  if (redisAvailable && redis) {
    const r = await redis.set(key, userId, 'EX', 300, 'NX');
    return r === 'OK';
  }
  return memSet(key, userId, 300);
}

export async function unlockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
  const key = `seat_lock:${showtimeId}:${seatId}`;
  const current = redisAvailable && redis ? await redis.get(key) : memGet(key);
  if (current === userId) {
    redisAvailable && redis ? await redis.del(key) : memDel(key);
    return true;
  }
  return false;
}

export async function getSeatLockOwner(showtimeId: string, seatId: string): Promise<string | null> {
  const key = `seat_lock:${showtimeId}:${seatId}`;
  return redisAvailable && redis ? redis.get(key) : memGet(key);
}

export async function unlockAllUserSeats(showtimeId: string, userId: string): Promise<void> {
  const prefix = `seat_lock:${showtimeId}:`;
  const keys = redisAvailable && redis ? await redis.keys(prefix + '*') : memKeys(prefix);
  for (const key of keys) {
    const owner = redisAvailable && redis ? await redis.get(key) : memGet(key);
    if (owner === userId) redisAvailable && redis ? await redis.del(key) : memDel(key);
  }
}

export const lockSeats = (showtimeId: string, userId: string, seatIds: string[]) =>
  Promise.all(seatIds.map(id => lockSeat(showtimeId, id, userId)));

export const releaseSeats = (showtimeId: string, userId: string) =>
  unlockAllUserSeats(showtimeId, userId);

export const getLockedSeats = async (showtimeId: string): Promise<string[]> => {
  const prefix = `seat_lock:${showtimeId}:`;
  const keys = redisAvailable && redis ? await redis.keys(prefix + '*') : memKeys(prefix);
  return keys.map(k => k.split(':')[2]).filter(Boolean);
};