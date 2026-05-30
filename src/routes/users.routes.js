import express from 'express';
import {
  registerUser,
  requestOtp,
  verifyOtp,
  getUserProfile,
} from '../controllers/users.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerUserSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../validators/users.validator.js';

const router = express.Router();

// Urutan middleware: validate → controller (sesuai SOP 06)
router.post('/register', validate(registerUserSchema), registerUser);
router.post('/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// Endpoint profile dilindungi JWT auth middleware
router.get('/profile', authenticate, getUserProfile);

export default router;
