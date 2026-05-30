import express from 'express';
import { getEisScore, getSessionAnalytics, getDashboardAnalytics } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminAuth.middleware.js';
import { validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { eisParamsSchema, sessionParamsSchema, dashboardQuerySchema } from '../validators/analytics.validator.js';

const router = express.Router();

// GET /api/v1/analytics/dashboard
router.get('/dashboard', authenticate, requireAdmin, validateQuery(dashboardQuerySchema), getDashboardAnalytics);

// GET /api/v1/analytics/eis/:user_id
router.get('/eis/:user_id', authenticate, validateParams(eisParamsSchema), getEisScore);

// GET /api/v1/analytics/session/:session_id
router.get('/session/:session_id', authenticate, validateParams(sessionParamsSchema), getSessionAnalytics);

export default router;


