import * as retentionService from '../services/retention.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Endpoint Controller untuk memicu pengiriman email retensi.
 * POST /api/v1/retention/trigger
 */
export const triggerRetention = async (req, res, next) => {
  try {
    const result = await retentionService.triggerRetention();
    return sendSuccess(res, 200, result, 'Proses trigger retensi selesai');
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint Controller untuk mengambil soal kuis retensi berdasarkan token.
 * GET /api/v1/retention/quiz/:token
 */
export const getRetentionQuiz = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await retentionService.getRetentionQuiz(token);
    return sendSuccess(res, 200, result, 'Soal kuis retensi berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint Controller untuk mengirim jawaban kuis retensi.
 * POST /api/v1/retention/submit/:token
 */
export const submitRetentionQuiz = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { answers } = req.body;
    const result = await retentionService.submitRetentionQuiz(token, answers);
    return sendSuccess(res, 201, result, 'Jawaban kuis retensi berhasil disimpan');
  } catch (error) {
    next(error);
  }
};


