import crypto from 'crypto';
import { AppError } from '../utils/response.js';

export const requireCronSecret = (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET_KEY || '';

  // Gunakan timingSafeEqual untuk mencegah timing attack
  const incoming = Buffer.from(secret || '');
  const expectedBuf = Buffer.from(expected);

  if (
    incoming.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(incoming, expectedBuf)
  ) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Otorisasi scheduler ditolak'));
  }
  next();
};
