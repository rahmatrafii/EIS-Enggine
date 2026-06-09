import * as analyticsService from '../services/analytics.service.js';
import { sendSuccess } from '../utils/response.js';

export const getEisScore = async (req, res, next) => {
  try {
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;
    const { user_id } = req.params;

    const result = await analyticsService.getEisScore(requestingUserId, requestingUserRole, user_id);

    return sendSuccess(res, 200, result, 'Data skor EIS berhasil diambil');
  } catch (error) {
    next(error);
  }
};

export const getSessionAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { session_id } = req.params;

    const result = await analyticsService.getSessionAnalytics(userId, session_id);

    return sendSuccess(res, 200, result, 'Data analitik sesi berhasil diambil');
  } catch (error) {
    next(error);
  }
};

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { date_from, date_to, age_category } = req.query;

    const result = await analyticsService.getDashboardAnalytics({ date_from, date_to, age_category });

    return sendSuccess(res, 200, result, 'Dashboard analitik berhasil diambil');
  } catch (error) {
    next(error);
  }
};

export const getVisitorList = async (req, res, next) => {
  try {
    const { date_from, date_to, age_category } = req.query;

    const result = await analyticsService.getVisitorList({ date_from, date_to, age_category });

    return sendSuccess(res, 200, result, 'Daftar pengunjung berhasil diambil');
  } catch (error) {
    next(error);
  }
};

export const getExhibitTrend = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;

    const result = await analyticsService.getExhibitTrend(exhibit_id);

    return sendSuccess(res, 200, result, 'Data tren kunjungan kandang berhasil diambil');
  } catch (error) {
    next(error);
  }
};



