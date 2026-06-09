import { z } from 'zod';

export const eisParamsSchema = z.object({
  user_id: z.coerce.number().int().positive('user_id harus berupa angka positif')
});

export const sessionParamsSchema = z.object({
  session_id: z.coerce.number().int().positive('session_id harus berupa angka positif')
});

export const dashboardQuerySchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date_from harus YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date_to harus YYYY-MM-DD').optional(),
  age_category: z.enum(['CHILD', 'TEEN', 'ADULT'], {
    errorMap: () => ({ message: 'Kategori umur harus berupa CHILD, TEEN, atau ADULT' })
  }).optional()
});

export const visitorsQuerySchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date_from harus YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date_to harus YYYY-MM-DD').optional(),
  age_category: z.enum(['CHILD', 'TEEN', 'ADULT'], {
    errorMap: () => ({ message: 'Kategori umur harus berupa CHILD, TEEN, atau ADULT' })
  }).optional()
});

export const exhibitTrendParamsSchema = z.object({
  exhibit_id: z.coerce.number().int().positive('exhibit_id harus berupa angka positif')
});



