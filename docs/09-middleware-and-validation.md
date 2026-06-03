# 09. Middleware and Validation

Sistem EIS Engine secara mutlak menolak logika percabangan validasi input data (`if (!req.body.email) ...`) diletakkan di Controller maupun Service Layer. Seluruh Payload JSON murni ditangani oleh interceptor `zod` Validator di posisi Middleware.

## Aturan Pembuatan File Middleware Validator Eksekutor (`validate.middleware.js`)
Gunakan blok logika middleware menggunakan utilitas metode pengecekan schema Zod `safeParse()`. Fitur `safeParse` sangat diandalkan karena meniadakan exception pelemparan code Error JS (Tweak exception flow), dan memastikan semua string error ditangkap halus lalu diarahkan ke Central Middleware global (Next).

```javascript
import { AppError } from '../utils/response.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    // Ekstrak detail pesan error Zod dari properti arrays
    const formattedError = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
      
    // Lempar Custom format Error Code 400 Validation
    return next(new AppError(400, 'VALIDATION_ERROR', formattedError));
  }
  
  // Timpa `req.body` dengan objek JSON parse hasil format pembersihan Schema (Stripping unrecognize fields)
  req.body = result.data; 
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  
  if (!result.success) {
    const formattedError = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
      
    return next(new AppError(400, 'VALIDATION_ERROR', formattedError));
  }
  
  // Express 5 req.query adalah read-only getter — gunakan Object.defineProperty untuk override
  Object.defineProperty(req, 'query', {
    value: result.data,
    writable: true,
    configurable: true,
  });
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  
  if (!result.success) {
    const formattedError = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
      
    return next(new AppError(400, 'VALIDATION_ERROR', formattedError));
  }
  
  req.params = result.data;
  next();
};
```

## Daftar Zod Schema (Wajib dibuat dalam src/validators/)

### 1. `users.validator.js`
```javascript
import { z } from 'zod';

export const requestOtpSchema = z.object({
  email: z.string().email('Format email tidak valid')
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP harus terdiri dari 6 digit karakter string')
});

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  email: z.string().email('Format email tidak valid'),
  age: z.number().int().min(5, 'Usia minimal 5 tahun').max(120, 'Usia maksimal 120 tahun')
});
```

### 2. `sessions.validator.js`
```javascript
import { z } from 'zod';

export const endSessionSchema = z.object({
  sessionId: z.number().int().positive('Sesi ID harus berupa angka positif')
});
```

### 3. `quizzes.validator.js`
```javascript
import { z } from 'zod';
import { QuizType } from '@prisma/client';

export const fetchQuizSchema = z.object({
  sessionId: z.number(),
  type: z.nativeEnum(QuizType),
  exhibitId: z.number().optional()
});

export const submitQuizSchema = z.object({
  sessionId: z.number(),
  quizId: z.number(),
  answers: z.array(z.object({
    questionId: z.number(),
    chosenOption: z.enum(['A', 'B', 'C', 'D'])
  })).min(1, 'Dibutuhkan setidaknya satu jawaban')
});
```

### 4. `track.validator.js`
```javascript
import { z } from 'zod';
import { MediaType } from '@prisma/client';

export const checkinSchema = z.object({
  sessionId: z.number(),
  qrCodeIdentifier: z.string().min(1)
});

export const interactSchema = z.object({
  interactionId: z.number(),
  mediaType: z.nativeEnum(MediaType)
});

export const labLogSchema = z.object({
  interactionId: z.number(),
  gameName: z.string(),
  actionTaken: z.string(),
  scoreAchieved: z.number().optional()
});

export const checkoutSchema = z.object({
  interactionId: z.number()
});
```

### 5. `admin.validator.js`
```javascript
import { z } from 'zod';

export const createExhibitSchema = z.object({
  name: z.string(),
  zoneName: z.string(),
  description: z.string().optional()
});

export const createContentSchema = z.object({
  exhibitId: z.number(),
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT']),
  contentTitle: z.string(),
  contentBody: z.string()
});

export const createMediaSchema = z.object({
  exhibitId: z.number(),
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT']),
  mediaType: z.enum(['AUDIO', 'VIDEO', 'IMAGE_INFOGRAPHIC', 'INTERACTIVE_LAB']),
  title: z.string(),
  fileUrl: z.string().url()
});

export const createQuizSchema = z.object({
  exhibitId: z.number().optional(),
  scope: z.enum(['GLOBAL', 'EXHIBIT']),
  title: z.string(),
  quizType: z.enum(['PRE_ZOO', 'POST_ZOO', 'RETENTION_1W', 'RETENTION_1M']),
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT']),
  questions: z.array(z.object({
    questionText: z.string(),
    optionA: z.string(),
    optionB: z.string(),
    optionC: z.string(),
    optionD: z.string(),
    correctOption: z.enum(['A', 'B', 'C', 'D']),
    points: z.number().default(10)
  })).min(1)
});
```
