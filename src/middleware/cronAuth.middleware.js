import crypto from 'crypto';
import { AppError } from '../utils/response.js';

export const requireCronSecret = (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET_KEY || '';

  // 1. Cek x-cron-secret (header kustom lokal/pengujian)
  let authenticated = false;
  if (secret && expected) {
    const incomingBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(expected);
    if (
      incomingBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, expectedBuf)
    ) {
      authenticated = true;
    }
  }

  // 2. Cek Authorization Bearer token (fitur bawaan Vercel Cron)
  const authHeader = req.headers['authorization'];
  const expectedVercel = process.env.CRON_SECRET || '';
  if (!authenticated && authHeader && authHeader.startsWith('Bearer ') && expectedVercel) {
    const token = authHeader.substring(7); // Panjang "Bearer " adalah 7
    const incomingBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedVercel);
    if (
      incomingBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, expectedBuf)
    ) {
      authenticated = true;
    }
  }

  if (!authenticated) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Otorisasi scheduler ditolak'));
  }
  next();
};
