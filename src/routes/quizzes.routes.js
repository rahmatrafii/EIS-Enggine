import express from 'express';
import { fetchQuiz, submitQuiz, getQuizResult, getRetentionStatus } from '../controllers/quizzes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateQuery, validate, validateParams } from '../middleware/validate.middleware.js';
import { fetchQuizSchema, submitQuizSchema, sessionParamsSchema } from '../validators/quizzes.validator.js';

const router = express.Router();

// GET /api/v1/quizzes/fetch
// Query params: sessionId (required), type (required), exhibitId (optional)
router.get('/fetch', authenticate, validateQuery(fetchQuizSchema), fetchQuiz);

// POST /api/v1/quizzes/submit
// Body: sessionId, quizId, answers (array of {questionId, chosenOption})
router.post('/submit', authenticate, validate(submitQuizSchema), submitQuiz);

// GET /api/v1/quizzes/result/:session_id
// Params: session_id
router.get('/result/:session_id', authenticate, validateParams(sessionParamsSchema), getQuizResult);

// GET /api/v1/quizzes/retention-status
// Response: Array of user's retention schedules
router.get('/retention-status', authenticate, getRetentionStatus);

export default router;
