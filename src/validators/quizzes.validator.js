import { z } from 'zod';

export const fetchQuizSchema = z.object({
  sessionId: z.coerce.number().int().positive('sessionId harus berupa angka positif'),
  type: z.enum(['PRE_ZOO', 'POST_ZOO', 'RETENTION_1W', 'RETENTION_1M'], {
    message: 'type harus berupa nilai QuizType yang valid'
  }),
  exhibitId: z.coerce.number().int().positive('exhibitId harus berupa angka positif').optional()
});

export const submitQuizSchema = z.object({
  sessionId: z.number().int().positive('sessionId harus berupa angka positif'),
  quizId: z.number().int().positive('quizId harus berupa angka positif'),
  answers: z.array(z.object({
    questionId: z.number().int().positive('questionId harus berupa angka positif'),
    chosenOption: z.enum(['A', 'B', 'C', 'D'])
  })).min(1, 'Dibutuhkan setidaknya satu jawaban')
});

export const sessionParamsSchema = z.object({
  // FIX: tambah .finite() — Zod v4 tidak otomatis reject NaN dari z.coerce.number()
  session_id: z.coerce.number().finite('session_id harus berupa angka valid').int().positive()
});