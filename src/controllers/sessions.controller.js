import * as sessionsService from '../services/sessions.service.js';
import { sendSuccess } from '../utils/response.js';

// ─── POST /api/v1/sessions/start ───────────────────────────────────────────────
export const startSession = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const session = await sessionsService.startSession(userId);
    return sendSuccess(res, 201, session, 'Sesi kunjungan berhasil dimulai');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/sessions/end ─────────────────────────────────────────────────
export const endSession = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { session_id } = req.body;
    const session = await sessionsService.endSession(session_id, userId);
    return sendSuccess(res, 200, session, 'Sesi kunjungan berhasil diakhiri');
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/sessions/history ─────────────────────────────────────────────
export const getHistory = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const sessions = await sessionsService.getSessionHistory(userId);
    return sendSuccess(res, 200, sessions, 'Riwayat kunjungan berhasil diambil');
  } catch (error) {
    next(error);
  }
};
