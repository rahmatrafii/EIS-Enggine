import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminAuth.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import { createExhibitSchema, getExhibitsQuerySchema, deleteExhibitSchema, createContentSchema, createMediaSchema, createQuizSchema } from '../validators/admin.validator.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// GET /api/v1/admin/exhibits
router.get(
  '/exhibits',
  authenticate,
  requireAdmin,
  validateQuery(getExhibitsQuerySchema),
  adminController.getExhibits
);

// POST /api/v1/admin/exhibits
router.post(
  '/exhibits',
  authenticate,
  requireAdmin,
  validate(createExhibitSchema),
  adminController.createExhibit
);

// DELETE /api/v1/admin/exhibits/:exhibit_id
router.delete(
  '/exhibits/:exhibit_id',
  authenticate,
  requireAdmin,
  validateParams(deleteExhibitSchema),
  adminController.deleteExhibit
);

// POST /api/v1/admin/content
router.post(
  '/content',
  authenticate,
  requireAdmin,
  validate(createContentSchema),
  adminController.upsertContent
);

// POST /api/v1/admin/media
router.post(
  '/media',
  authenticate,
  requireAdmin,
  validate(createMediaSchema),
  adminController.createMedia
);

// POST /api/v1/admin/quizzes
router.post(
  '/quizzes',
  authenticate,
  requireAdmin,
  validate(createQuizSchema),
  adminController.createQuiz
);

export default router;

