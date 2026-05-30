import { AppError } from '../utils/response.js';

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Akses ditolak. Memerlukan otorisasi level admin.'));
  }
  next();
};
