import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { determineAgeCategory } from '../utils/ageCategory.js';
import { generateOtp } from '../utils/otpGenerator.js';
import { sendEmail } from '../utils/emailSender.js';

// ─── Register User ─────────────────────────────────────────────────────────────
export const registerUser = async (name, email, age) => {
  // 1. Cek duplikasi email
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email ini telah terdaftar di sistem');
  }

  // 2. Kalkulasi usia → ageCategory
  const ageCategory = determineAgeCategory(age);

  // 3. Buat entitas User baru
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      age,
      ageCategory,
    },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      ageCategory: true,
      registeredAt: true,
    },
  });

  return newUser;
};

// ─── Request OTP ───────────────────────────────────────────────────────────────
export const requestOtp = async (email) => {
  // 1. Pastikan user dengan email ini terdaftar
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Email tidak ditemukan di sistem');
  }

  // 2. Generate OTP 6 digit & expiry 10 menit dari sekarang
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 3. Simpan OTP ke database (plain text — OTP bersifat short-lived, sesuai SOP 05)
  await prisma.user.update({
    where: { email },
    data: { otpCode: otp, otpExpiresAt },
  });

  // 4. Kirim email via Resend
  await sendEmail({
    to: email,
    subject: 'Kode OTP EIS Engine',
    html: `
      <h2>Kode OTP Anda</h2>
      <p>Gunakan kode berikut untuk masuk ke aplikasi EIS Engine:</p>
      <h1 style="letter-spacing: 8px; font-size: 36px;">${otp}</h1>
      <p>Kode ini berlaku selama <strong>10 menit</strong>.</p>
      <p>Jangan bagikan kode ini kepada siapapun.</p>
    `,
  });

  return { message: 'OTP berhasil dikirim ke email' };
};

// ─── Verify OTP & Cetak JWT ────────────────────────────────────────────────────
export const verifyOtp = async (email, otp) => {
  // 1. Temukan user dan periksa OTP
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.otpCode) {
    throw new AppError(400, 'OTP_INVALID', 'OTP tidak valid atau tidak ditemukan');
  }

  // 2. Cek apakah OTP sudah kedaluwarsa
  if (new Date() > user.otpExpiresAt) {
    throw new AppError(400, 'OTP_EXPIRED', 'OTP telah kedaluwarsa. Silakan minta OTP baru');
  }

  // 3. Cek kecocokan OTP
  if (user.otpCode !== otp) {
    throw new AppError(400, 'OTP_INVALID', 'Kode OTP yang dimasukkan salah');
  }

  // 4. Invalidasi OTP — set ke NULL setelah berhasil digunakan
  await prisma.user.update({
    where: { email },
    data: { otpCode: null, otpExpiresAt: null },
  });

  // 5. Buat payload JWT sesuai SOP 05 & tanda tangani
  const expiresIn = user.role === 'ADMIN' ? '1d' : '7d';
  const token = jwt.sign(
    {
      userId: user.id,
      ageCategory: user.ageCategory,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
    },
  };
};

// ─── Get User Profile ──────────────────────────────────────────────────────────
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      ageCategory: true,
      role: true,
      registeredAt: true,
      // otpCode & otpExpiresAt sengaja tidak di-select (data sensitif)
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  return user;
};
