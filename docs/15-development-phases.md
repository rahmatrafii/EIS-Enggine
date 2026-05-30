# 15. Development Phases

Fase pengembangan proyek backend EIS Engine telah dirumuskan secara berurutan agar alur dependensi modul logis, teruji secara inkremental, dan meminimalisir refactoring yang disebabkan oleh ketidaklengkapan modul dasarnya.

Berikut adalah 10 fase yang wajib dijalankan secara beruntun oleh developer.

---

## FASE 0 — Project Initialization & Setup
**Tujuan:** Menyiapkan fondasi project yang siap dikoding dan dipastikan environment terkoneksi.
**Tugas:**
- [ ] Inisialisasi project: `npm init`, set `"type": "module"` di package.json
- [ ] Install semua dependencies: `express`, `@prisma/client`, `prisma`, `jsonwebtoken`, `zod`, `resend`, `node-cron`, `cors`, `helmet`, `dotenv`
- [ ] Install devDependencies: `jest`, `supertest`, `nodemon`
- [ ] Buat file `.env` dari `.env.example`, isi semua variabel
- [ ] Buat file `src/app.js` (Express app tanpa route — hanya middleware global: cors, helmet, json parser)
- [ ] Buat file `server.js` (import app, listen port)
- [ ] Buat `src/config/prisma.js` (Prisma client singleton)
- [x] Install dependency Cloudinary: `npm install cloudinary multer`
- [x] Buat `src/config/cloudinary.js` dan verifikasi koneksi ke Cloudinary
- [ ] Jalankan `npx prisma db push` untuk sinkronisasi schema ke Supabase
- [ ] Buat `jest.config.js` untuk konfigurasi Jest + ESM
- [ ] Buat `tests/setup.js`
**Output:** Project bisa dijalankan dengan perintah Start tanpa memunculkan Error di konsol.
**Kriteria Selesai (DoD):** `node server.js` berjalan di port 3000, Prisma terhubung secara mulus ke Database Supabase.

---

## FASE 1 — Utilities & Error Handling Foundation
**Tujuan:** Membangun semua fungsi utilitas pendukung kecil dan filter sistem error terpusat sebelum fitur logika berat apapun ditulis.
**Tugas:**
- [x] Buat `src/utils/response.js` → `sendSuccess()`, `sendError()`, class `AppError`
- [x] Buat `src/utils/ageCategory.js` → fungsi `determineAgeCategory(age)`
- [x] Buat `src/utils/otpGenerator.js` → fungsi `generateOtp()`
- [x] Buat `src/utils/tokenUrl.js` → `generateRetentionToken()`, `verifyRetentionToken()`
- [x] Buat `src/utils/eisCalculator.js` → seluruh 5 fungsi kalkulasi formula EIS
- [x] Buat `src/utils/emailSender.js` → integrasi fungsi `sendEmail({ to, subject, html })`
- [x] Buat central error handler di `src/middleware/error.middleware.js`
- [x] Daftarkan pemanggilan `app.use(errorHandler)` pada posisi akhir di `src/app.js`
- [x] Buat pencegat validasi `src/middleware/validate.middleware.js` menggunakan Zod
**Output:** Semua file utils dan middleware layer exception siap di-import pada logika core.
**Kriteria Selesai (DoD):** Modul utilitas ter-ekspor (tidak syntax error), dan middleware menangkap class AppError jika diuji coba.

---

## FASE 2 — Auth Middleware
**Tujuan:** Membangun dinding pengaman autentikasi JWT untuk memfilter identitas user dan menyortir tipe request.
**Tugas:**
- [ ] Buat `src/middleware/auth.middleware.js` → verifikasi JWT header, sematkan `req.user`
- [ ] Buat `src/middleware/adminAuth.middleware.js` → sortir tambahan mengecek `req.user.role === 'ADMIN'`
- [ ] Buat `src/middleware/cronAuth.middleware.js` → cek keabsahan rahasia string di header `x-cron-secret`
**Output:** 3 file module middleware pengamanan siap menjaga endpoints.
**Kriteria Selesai (DoD):** Akses Endpoint dummy yang berlapis Middleware berhasil menolak request tanpa token dengan error code 401.

---

## FASE 3 — Users: OTP Login & Registrasi
**Tujuan:** Membangun pintu masuk pengunjung (Registration & Email Login).
**Endpoint Target:**
- `POST /api/v1/users/register`
- `POST /api/v1/users/request-otp`
- `POST /api/v1/users/verify-otp`
- `GET /api/v1/users/profile`
**Tugas:**
- [x] Susun rules `src/validators/users.validator.js`
- [x] Susun Core logic `src/services/users.service.js`
- [x] Susun `src/controllers/users.controller.js`
- [x] Daftarkan path di `src/routes/users.routes.js` dan sisipkan ke `src/app.js`
- [x] Tulis Test file `tests/users.test.js` dengan minimal 12 case kombinasi
**Output:** Fitur pengelolaan User berfungsi hingga pengiriman Email via Resend.
**Kriteria Selesai (DoD):** `npm test tests/users.test.js` sukses semua centang hijau.

---

## FASE 4 — Visit Sessions
**Tujuan:** Membangun siklus nafas satu sesi kunjungan dari masuk dan keluar kebun binatang.
**Endpoint Target:**
- `POST /api/v1/sessions/start`
- `POST /api/v1/sessions/end`
- `GET /api/v1/sessions/history`
**Tugas:**
- [x] Buat `src/validators/sessions.validator.js`
- [x] Buat `src/services/sessions.service.js`
- [x] Dalam logic `endSession`, WAJIB ada injeksi pembentukan row `retention_schedules` (H+7 & H+30)
- [x] Buat Controller & Route sessions.
- [x] Tulis Test `tests/sessions.test.js` dengan minimal 9 case.
**Output:** Aplikasi tahu secara State bahwa user sedang berada di dalam Kebun Binatang atau sudah pulang.
**Kriteria Selesai (DoD):** `npm test tests/sessions.test.js` hijau.

---

## FASE 5 — Quiz & Assessment
**Tujuan:** Pembangunan Sistem Kuis Edukatif adaptif dengan usia.
**Endpoint Target:**
- `GET /api/v1/quizzes/fetch`
- `POST /api/v1/quizzes/submit`
- `GET /api/v1/quizzes/result/:session_id`
- `GET /api/v1/quizzes/retention-status`
**Tugas:**
- [ ] Buat Validator `quizzes.validator.js`
- [ ] Tulis `quizzes.service.js` yang mana dalam `submitQuiz` bertipe `POST_ZOO` harus segera memanggil pembaruan poin di `eis.service.js`.
- [ ] Buat Controller & Route quizzes.
- [ ] Buat pengujian `tests/quizzes.test.js` dengan minimal 12 case.
**Output:** Sistem kuis yang aman terhadap manipulasi skor dari JSON payload mentah dari user.
**Kriteria Selesai (DoD):** `npm test tests/quizzes.test.js` hijau.

---

## FASE 6 — Tracking (QR Code & Interaksi)
**Tujuan:** Mesin pencatat metrik dan parameter perilaku pengunjung terhadap objek dalam satu lokasi kandang.
**Endpoint Target:**
- `POST /api/v1/track/checkin`
- `PATCH /api/v1/track/interact`
- `POST /api/v1/track/lab-log`
- `POST /api/v1/track/checkout`
**Tugas:**
- [ ] Buat schema validation `track.validator.js`
- [ ] Bangun `track.service.js` dengan logic return `checkIn` menyuguhkan array Artikel Edukasi yang sesuai `ageCategory`. Serta `checkOut` mengukur durasi akhir `durationSeconds`.
- [ ] Buat Controller & Route track.
- [ ] Tulis uji `tests/track.test.js` (min 12 case).
**Output:** Catatan detail log klik dan waktu bersemayam untuk diolah poin engagement.
**Kriteria Selesai (DoD):** `npm test tests/track.test.js` hijau.

---

## FASE 7 — Retention Scheduler & Kuis Retensi
**Tujuan:** Otomatisasi pengingat paska kunjungan dan pengisian kuis jarak jauh.
**Endpoint Target:**
- `POST /api/v1/retention/trigger` (Endpoint Vercel Cron-friendly)
- `GET /api/v1/retention/quiz/:token` (Akses View Soal URL Khusus)
- `POST /api/v1/retention/submit/:token` (Kumpul Soal Token Khusus)
**Tugas:**
- [ ] Buat daemon `src/scheduler/retention.scheduler.js` menggunakan instansi `node-cron`.
- [ ] Buat logic `retention.service.js`, di mana pengumpulan memicu kalkulasi final EIS.
- [ ] Buat Controller & Route retention.
- [ ] Aktifkan `startRetentionCron()` di `server.js`.
- [ ] Buat uji `tests/retention.test.js` dengan mem-*mock* komponen Email (min 9 case).
**Output:** Email meluncur mulus dari backend secara periodik.
**Kriteria Selesai (DoD):** `npm test tests/retention.test.js` hijau.

---

## FASE 8 — Analytics & EIS Score
**Tujuan:** Menjalankan mesin rekapitulasi poin akhir berdasarkan 3 pilar formula (Knowledge, Engage, Retain).
**Endpoint Target:**
- `GET /api/v1/analytics/eis/:user_id`
- `GET /api/v1/analytics/session/:session_id`
- `GET /api/v1/analytics/dashboard`
**Tugas:**
- [ ] Bangun modul mandiri `eis.service.js` berisi fungsi agregasi berat `recalculateEis()`.
- [ ] Bangun view data `analytics.service.js`.
- [ ] Buat Controller & Route analytics.
- [ ] Tulis `tests/analytics.test.js` (min 9 case).
**Output:** Laporan dan skor badge yang dapat disajikan oleh Client Mobile App / Dashboard CMS.
**Kriteria Selesai (DoD):** `npm test tests/analytics.test.js` hijau.

---

## FASE 9 — Admin Panel Endpoints
**Tujuan:** Memberikan kemudahan pembuatan materi (CMS) Database pada peran Admin.
**Endpoint Target:**
- `POST /api/v1/admin/exhibits`
- `GET /api/v1/admin/exhibits`
- `DELETE /api/v1/admin/exhibits/:exhibit_id`
- `POST /api/v1/admin/content`
- `POST /api/v1/admin/media`
- `POST /api/v1/admin/quizzes`
**Tugas:**
- [ ] Buat Validator `admin.validator.js`
- [ ] Buat `admin.service.js` (CRUD Operasi murni).
- [ ] Buat Controller & Route Admin (Dilindungi ganda `authMiddleware` + `adminAuthMiddleware`).
- [ ] Tulis Uji `tests/admin.test.js` (min 18 case positif & limit role).
**Output:** Semua endpoint Admin berfungsi membuat dan menghapus struktur zoo.
**Kriteria Selesai (DoD):** `npm test tests/admin.test.js` hijau.

---

## FASE 10 — Final Integration & Full Test Suite
**Tujuan:** Memvalidasi seluruh bagian dalam harmoni terpadu (Quality Assurance sebelum Deploy).
**Tugas:**
- [ ] Perintah test masif (Integration sweep): `npm test` dipastikan lolos tanpa hambatan.
- [ ] Pengecekan Coverage `npm run test:coverage` mencapai limit min >= 80%.
- [ ] Pengecekan Checklist dokumen tabel `docs/16-feature-log.md` tertandai ✅ lengkap.
- [ ] Audit arsitektur codebase (Zero Business Logic in Controller, Zero Express Req/Res di Service).
- [ ] Audit string code pada `.env.example` mewakili keseluruhan sistem rahasia production.
**Output:** Source code API Backend yang Tangguh (Robust), siap masuk Docker / PaaS Server Production.
**Kriteria Selesai (DoD):** Laporan Test coverage ter-generate memenuhi Standard KPI tanpa Exception bocor.
