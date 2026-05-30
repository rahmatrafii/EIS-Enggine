import { z } from 'zod';
const schema = z.object({ session_id: z.coerce.number().int().positive() });
const result = schema.safeParse({ session_id: 'abc' });
console.log(result.error.errors !== undefined);
console.log(result.error.issues !== undefined);
