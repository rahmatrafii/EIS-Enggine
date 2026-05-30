import { z } from 'zod';

export const triggerRetentionSchema = z.object({});

export const retentionQuizParamsSchema = z.object({
  token: z.string().min(1, 'Token retensi wajib disertakan'),
});

export const submitRetentionQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number(),
      chosenOption: z.enum(['A', 'B', 'C', 'D']),
    })
  ).min(1, 'Dibutuhkan setidaknya satu jawaban'),
});

