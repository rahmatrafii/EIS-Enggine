import { z } from 'zod';

// ─── POST /api/v1/sessions/end ─────────────────────────────────────────────────
export const endSessionSchema = z.object({
  session_id: z
    .number({ invalid_type_error: 'session_id harus berupa angka' })
    .int('session_id harus bilangan bulat')
    .positive('session_id harus bernilai positif'),
});
