import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminAuth.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import { createExhibitSchema, getExhibitsQuerySchema, deleteExhibitSchema, getExhibitDetailSchema, updateExhibitSchema, createContentSchema, createMediaSchema, createQuizSchema, getQuizDetailSchema, deleteContentSchema, deleteMediaSchema, updateQuizSchema, deleteQuizSchema, createLabGameSchema, updateLabGameSchema, getLabGameParamsSchema, getLabGamesQuerySchema } from '../validators/admin.validator.js';
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

// GET /api/v1/admin/exhibits/:exhibit_id
router.get(
  '/exhibits/:exhibit_id',
  authenticate,
  requireAdmin,
  validateParams(getExhibitDetailSchema),
  adminController.getExhibitDetail
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

// POST /api/v1/admin/exhibits/:exhibit_id/activate
router.post(
  '/exhibits/:exhibit_id/activate',
  authenticate,
  requireAdmin,
  validateParams(deleteExhibitSchema),
  adminController.activateExhibit
);

// DELETE /api/v1/admin/exhibits/:exhibit_id/permanent
router.delete(
  '/exhibits/:exhibit_id/permanent',
  authenticate,
  requireAdmin,
  validateParams(deleteExhibitSchema),
  adminController.hardDeleteExhibit
);

// PUT /api/v1/admin/exhibits/:exhibit_id
router.put(
  '/exhibits/:exhibit_id',
  authenticate,
  requireAdmin,
  validateParams(getExhibitDetailSchema),
  validate(updateExhibitSchema),
  adminController.updateExhibit
);

// POST /api/v1/admin/content
router.post(
  '/content',
  authenticate,
  requireAdmin,
  validate(createContentSchema),
  adminController.upsertContent
);

// DELETE /api/v1/admin/content/:id
router.delete(
  '/content/:id',
  authenticate,
  requireAdmin,
  validateParams(deleteContentSchema),
  adminController.deleteContent
);

// POST /api/v1/admin/media
router.post(
  '/media',
  authenticate,
  requireAdmin,
  validate(createMediaSchema),
  adminController.createMedia
);

// DELETE /api/v1/admin/media/:id
router.delete(
  '/media/:id',
  authenticate,
  requireAdmin,
  validateParams(deleteMediaSchema),
  adminController.deleteMedia
);

// POST /api/v1/admin/quizzes
router.post(
  '/quizzes',
  authenticate,
  requireAdmin,
  validate(createQuizSchema),
  adminController.createQuiz
);

// GET /api/v1/admin/quizzes
router.get(
  '/quizzes',
  authenticate,
  requireAdmin,
  adminController.getQuizzes
);

// GET /api/v1/admin/quizzes/:quiz_id
router.get(
  '/quizzes/:quiz_id',
  authenticate,
  requireAdmin,
  validateParams(getQuizDetailSchema),
  adminController.getQuizDetail
);

// PUT /api/v1/admin/quizzes/:quiz_id
router.put(
  '/quizzes/:quiz_id',
  authenticate,
  requireAdmin,
  validateParams(getQuizDetailSchema),
  validate(updateQuizSchema),
  adminController.updateQuiz
);

// DELETE /api/v1/admin/quizzes/:quiz_id
router.delete(
  '/quizzes/:quiz_id',
  authenticate,
  requireAdmin,
  validateParams(deleteQuizSchema),
  adminController.deleteQuiz
);


// POST /api/v1/admin/lab-games
router.post(
  '/lab-games',
  authenticate,
  requireAdmin,
  validate(createLabGameSchema),
  adminController.createLabGame
);

// GET /api/v1/admin/lab-games
router.get(
  '/lab-games',
  authenticate,
  requireAdmin,
  validateQuery(getLabGamesQuerySchema),
  adminController.getLabGames
);

// GET /api/v1/admin/lab-games/:game_id
router.get(
  '/lab-games/:game_id',
  authenticate,
  requireAdmin,
  validateParams(getLabGameParamsSchema),
  adminController.getLabGameDetail
);

// PUT /api/v1/admin/lab-games/:game_id
router.put(
  '/lab-games/:game_id',
  authenticate,
  requireAdmin,
  validateParams(getLabGameParamsSchema),
  validate(updateLabGameSchema),
  adminController.updateLabGame
);

// DELETE /api/v1/admin/lab-games/:game_id
router.delete(
  '/lab-games/:game_id',
  authenticate,
  requireAdmin,
  validateParams(getLabGameParamsSchema),
  adminController.deleteLabGame
);

export default router;


