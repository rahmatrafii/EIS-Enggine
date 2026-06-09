import { z } from 'zod';
import { MediaType } from '@prisma/client';

export const checkinSchema = z.object({
  sessionId: z.number().int().positive('sessionId harus berupa angka positif'),
  qrCodeIdentifier: z.string().min(1, 'qrCodeIdentifier wajib diisi')
});

export const interactSchema = z.object({
  interactionId: z.number().int().positive('interactionId harus berupa angka positif'),
  mediaType: z.nativeEnum(MediaType, { errorMap: () => ({ message: 'mediaType tidak valid' }) })
});

export const labLogSchema = z.object({
  interactionId: z.number().int().positive('interactionId harus berupa angka positif'),
  gameName: z.string().min(1, 'gameName wajib diisi'),
  actionTaken: z.string().min(1, 'actionTaken wajib diisi'),
  scoreAchieved: z.number().int().optional()
});

export const checkoutSchema = z.object({
  interactionId: z.number().int().positive('interactionId harus berupa angka positif')
});

export const getVisitorLabGamesQuerySchema = z.object({
  exhibit_id: z.coerce.number().int().positive('exhibit_id harus berupa angka bulat positif')
});
