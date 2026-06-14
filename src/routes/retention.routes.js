import { Router } from 'express';
import * as retentionController from '../controllers/retention.controller.js';
import { validate, validateParams } from '../middleware/validate.middleware.js';
import { requireCronSecret } from '../middleware/cronAuth.middleware.js';
import { 
  triggerRetentionSchema, 
  retentionQuizParamsSchema,
  submitRetentionQuizSchema 
} from '../validators/retention.validator.js';

const router = Router();

// POST & GET /api/v1/retention/trigger
// Dilindungi cronAuth middleware (bukan JWT) — cek header x-cron-secret atau Authorization Bearer
router.route('/trigger')
  .post(
    requireCronSecret,
    validate(triggerRetentionSchema),
    retentionController.triggerRetention
  )
  .get(
    requireCronSecret,
    retentionController.triggerRetention
  );

// GET /api/v1/retention/quiz/:token
// Tanpa JWT auth — autentikasi via retention token di URL params
router.get(
  '/quiz/:token',
  validateParams(retentionQuizParamsSchema),
  retentionController.getRetentionQuiz
);

// POST /api/v1/retention/submit/:token
// Tanpa JWT auth — autentikasi via retention token di URL params
router.post(
  '/submit/:token',
  validateParams(retentionQuizParamsSchema),
  validate(submitRetentionQuizSchema),
  retentionController.submitRetentionQuiz
);

export default router;

