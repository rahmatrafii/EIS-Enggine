import * as usersService from '../services/users.service.js';
import { sendSuccess } from '../utils/response.js';

// ─── POST /api/v1/users/register ───────────────────────────────────────────────
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, age } = req.body;
    const newUser = await usersService.registerUser(name, email, age);
    return sendSuccess(res, 201, newUser, 'Registrasi berhasil');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/users/request-otp ───────────────────────────────────────────
export const requestOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await usersService.requestOtp(email);
    return sendSuccess(res, 200, result, 'OTP berhasil dikirim ke email');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/users/verify-otp ────────────────────────────────────────────
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const tokenPayload = await usersService.verifyOtp(email, otp);
    return sendSuccess(res, 200, tokenPayload, 'Verifikasi sukses. JWT Token diterbitkan.');
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/users/profile ─────────────────────────────────────────────────
export const getUserProfile = async (req, res, next) => {
  try {
    // userId disuntikkan oleh auth.middleware ke req.user
    const { userId } = req.user;
    const profile = await usersService.getUserProfile(userId);
    return sendSuccess(res, 200, profile, 'Profil pengguna berhasil diambil');
  } catch (error) {
    next(error);
  }
};
