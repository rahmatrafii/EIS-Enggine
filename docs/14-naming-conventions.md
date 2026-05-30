# 14. Naming Conventions

Panduan ini mengatur gaya huruf dan tata bahasa penamaan file, fungsi, hingga konstanta untuk menjaga konsistensi codebase dan kemudahan keterbacaan oleh antar-anggota tim pengembang.

## Aturan Penamaan Berkas (Files)
- Format: `kebab-case.tipe.js`
- Router: `domain.routes.js` (contoh: `users.routes.js`)
- Controller: `domain.controller.js` (contoh: `users.controller.js`)
- Service: `domain.service.js` (contoh: `users.service.js`)
- Middleware: `name.middleware.js` (contoh: `auth.middleware.js`)
- Validator: `domain.validator.js` (contoh: `track.validator.js`)
- Test: `domain.test.js` (contoh: `users.test.js`)

## Konstanta dan Environment
- Format: `UPPER_SNAKE_CASE`
- Contoh di file JS: `const MAX_ENGAGEMENT_SCORE = 100;`, `const OTP_LENGTH = 6;`
- Contoh kode Error Kustom di AppError: `'OTP_EXPIRED'`, `'QUIZ_ALREADY_SUBMITTED'`

## Variabel Data dan Database
- **Di Kode JavaScript**: SELALU format `camelCase` (Contoh: `let ageCategory = ...`, `req.body.otpCode`).
- **Pengecualian DB**: Karena Prisma kita set menggunakan penanda `@map("kolom_asli")`, maka pengembang mengabaikan `snake_case` tabel PostgreSQL saat menyentuh `prisma.*` dan murni mengetik query Prisma dengan `camelCase` (Contoh: `prisma.visitSession.findMany(...)`).

## Aturan Boolean Variabel
Harus selalu diawali dengan awalan prefix indikatif untuk kemudahan pembacaan kondisi `if`:
- Gunakan `is` untuk status (Contoh: `isCompleted`, `isActive`, `isCorrect`).
- Gunakan `has` untuk kepemilikan/anak komponen (Contoh: `hasMedia`, `hasLabActivity`).
- Gunakan `can` untuk kualifikasi tindakan (Contoh: `canRetry`).

## Aturan Route Paths API
- Kata Dasar: Harus **kata benda jamak (Plural Nouns)** dalam bahasa inggris.
  - Benar: `/api/v1/users`, `/api/v1/visit-sessions`
  - Salah: `/api/v1/user`, `/api/v1/User_Profile`
- Multi frasa: Gunakan separator strip (`kebab-case`).
  - Benar: `/api/v1/quiz-attempts`

## Pola Penamaan Nama Fungsi (Functions)
- Controller & Service format **Action + Target** (Kata Kerja + Kata Benda - format `camelCase`):
  - Autentikasi: `requestOtp()`, `verifyOtp()`
  - Sesi: `startSession()`, `endSession()`
  - Pengambilan Data: `fetchQuiz()`, `getQuizResult()`
  - Pemrosesan Input: `submitQuiz()`, `checkIn()`, `checkOut()`
- Utilitas (Kalkulasi):
  - `calculateEisScore()`, `generateOtp()`
- Validator Zod (Export nama konstanta schemas):
  - Suffix `Schema` (Contoh: `requestOtpSchema`, `checkinSchema`)

## Deskripsi / Name di Unit Test
Penamaan blok string `it()` dalam Jest wajib mengikuti kalimat perilaku: `"should [expected behavior] when [condition]"`.
- Benar: `it('should return 400 validation error when email format is invalid', ...)`
- Salah: `it('test otp gagal fungsi x', ...)`

## Ekspor Modul
Sistem ESM mensyaratkan untuk menghindari _default export_ untuk modul dengan fungsi lebih dari satu, guna memanfaatkan destructuring yang prediktif.
- Gunakan Named Export: `export const foo = () => {}`, `export const bar = () => {}`
- Pengecualian Default Export (Hanya boleh untuk instance utama file utuh): `export default prisma;`, `export default app;`.
