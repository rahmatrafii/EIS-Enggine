import express from 'express';
import { startSession, endSession, getHistory } from '../controllers/sessions.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { endSessionSchema } from '../validators/sessions.validator.js';

const router = express.Router();

// Semua endpoint sesi wajib dilindungi authenticate (operasi terikat identitas user)
// Tidak memerlukan validate middleware karena tidak ada body yang perlu divalidasi
router.post('/start', authenticate, startSession);
router.post('/end', authenticate, validate(endSessionSchema), endSession);
router.get('/history', authenticate, getHistory);

export default router;
