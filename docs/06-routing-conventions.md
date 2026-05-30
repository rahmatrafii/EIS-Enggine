# 06. Routing Conventions

Agar konfigurasi router lebih modular, EIS Engine menggunakan pemisahan file router murni yang disatukan di berkas `src/app.js`.

## Aturan Template File Router

Sebuah file router HANYA BOLEH mengandung deklarasi path API, pemanggilan urutan Middleware, dan penunjukan fungsi dari Controller. DILARANG KERAS menaruh callback anonim untuk operasi logika database pada router.

### Contoh Template `users.routes.js` Lengkap:
```javascript
import express from 'express';
import { 
  registerUser, 
  requestOtp, 
  verifyOtp, 
  getUserProfile 
} from '../controllers/users.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  registerUserSchema, 
  requestOtpSchema, 
  verifyOtpSchema 
} from '../validators/users.validator.js';

const router = express.Router();

router.post('/register', validate(registerUserSchema), registerUser);
router.post('/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.get('/profile', authMiddleware, getUserProfile);

export default router;
```

## Urutan Middleware Eksekusi
Rantai atau ranting Middleware harus dijamin secara berurutan sesuai lifecycle keamanan:
1. `authMiddleware` atau `adminAuthMiddleware` (Autentikasi siapa penembaknya / Hak Peran)
2. `validate(schema)` (Validasi struktur properti JSON payload untuk hindari exploit)
3. `controller` (Eksekutor terakhir sebelum dioper ke layer service)

Contoh Route Admin yang benar:
```javascript
router.post('/exhibits', authMiddleware, adminAuthMiddleware, validate(createExhibitSchema), createExhibit);
```

## Penamaan Route URI Path
- Harus merupakan kata benda majemuk (Plural Noun). Contoh: `/api/v1/sessions` BUKAN `/api/v1/session`.
- Pisahkan dengan `kebab-case` jika dua frasa kata. Contoh: `/api/v1/quizzes/retention-status` BUKAN `/api/v1/quizzes/retentionStatus`.

## Mendaftarkan Router di `src/app.js`
Dalam app utama, routing base URL akan disambungkan (prefix). Seluruh router dikumpulkan menjadi seperti berikut:
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import semua file routes (ESM Requires full path & .js)
import usersRoutes from './routes/users.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import quizzesRoutes from './routes/quizzes.routes.js';
import trackRoutes from './routes/track.routes.js';
import retentionRoutes from './routes/retention.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';

import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Global Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// API Prefix Routing Registration
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/sessions`, sessionsRoutes);
app.use(`${API_PREFIX}/quizzes`, quizzesRoutes);
app.use(`${API_PREFIX}/track`, trackRoutes);
app.use(`${API_PREFIX}/retention`, retentionRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Fallback & Central Error Handler 
// Didaftarkan paling AKHIR di app.js !
app.use(errorHandler);

export default app;
```
