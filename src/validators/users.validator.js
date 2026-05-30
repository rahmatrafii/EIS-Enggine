import { z } from 'zod';

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid'),
  age: z
    .number({ invalid_type_error: 'Usia harus berupa angka' })
    .int('Usia harus berupa bilangan bulat')
    .min(5, 'Usia minimal 5 tahun')
    .max(120, 'Usia maksimal 120 tahun'),
});

export const requestOtpSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  otp: z.string().length(6, 'OTP harus terdiri dari 6 digit karakter string'),
});
