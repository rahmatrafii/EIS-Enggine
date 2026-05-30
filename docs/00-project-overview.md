# 00. Project Overview

## Apa itu EIS Engine?
EIS Engine (Educational Impact Score Engine) adalah backend REST API untuk aplikasi Zoo Companion App. Sistem ini dirancang untuk mengukur secara komprehensif dampak edukasi kunjungan kebun binatang terhadap setiap pengunjung. Semua pencapaian tersebut dihitung menjadi nilai EIS Score.

## 5 Fase Perjalanan Pengunjung
1. **Registrasi**: Pengunjung melakukan sign up dan request masuk dengan kode OTP (email).
2. **Tracking (Check-in)**: Pengunjung melakukan pindai QR code (check-in) di tiap exhibit. Sistem akan mencatat durasi serta merekam interaksi konten.
3. **Assessment**: Pengunjung wajib melalui kuis pada sebelum (pre-zoo) dan sesudah kunjungan (post-zoo).
4. **Retensi**: Pengunjung akan diuji ingatannya mengenai hal edukatif lewat pengiriman kuis retensi melalui Email di H+7 dan H+30 setelah kunjungan.
5. **Analitik**: Sistem secara otomatis mengeksekusi perhitungan kalkulasi berdasarkan knowledge gain, engagement exhibit, dan data kuis retensi menjadi EIS Score pengunjung secara individual.

## Tech Stack
- **Runtime**: Node.js >= 20
- **Module System**: ES Modules (ESM)
- **Framework**: Express.js 4.x
- **ORM**: Prisma (terhubung ke PostgreSQL Supabase via `DATABASE_URL`)
- **Storage**: Cloudinary
- **Auth**: JWT (manual menggunakan `jsonwebtoken`)
- **OTP Login**: Resend API (OTP 6 digit via email)
- **Scheduler**: `node-cron`
- **Testing**: Jest + Supertest
- **Validation**: Zod
- **Bahasa**: JavaScript (BUKAN TypeScript / CommonJS)

## 13 Tabel Database
1. **User**: Menyimpan data pengunjung dan admin, termasuk verifikasi OTP email login.
2. **Exhibit**: Daftar seluruh area exhibit dan identifier QR code setiap exhibit.
3. **ExhibitMedia**: Semua aset media digital interaktif (audio, video, infografis) per exhibit disesuaikan oleh usia pengunjung.
4. **LearningPathContent**: Artikel konten pembelajaran berbasis kategori umur untuk exhibit.
5. **VisitSession**: Mencatat sesi dari awal check-in masuk hingga check-out selesai di kebun binatang.
6. **Quiz**: Informasi tiap kuis yang diadakan (baik kuis kebun binatang umum atau spesifik exhibit).
7. **Question**: Setiap soal pilihan ganda (A, B, C, D) yang bertaut kepada kuis tertentu beserta kunci jawabannya.
8. **UserQuizAttempt**: Sesi pengambilan dan skor evaluasi dari percobaan seorang user pada suatu kuis.
9. **UserQuizAnswer**: Detail pilihan dari tiap pertanyaan oleh user pada satu log pengambilan.
10. **Interaction**: Catatan sesi setiap kali pengunjung singgah pada sebuah exhibit dan mengklik jenis media.
11. **InteractiveLabLog**: Aktivitas lebih mendalam terkait skor dari permainan mini lab di dalam exhibit.
12. **RetentionSchedule**: Pengaturan jadwal dan status antrean untuk otomatisasi scheduler pengiriman kuis retensi ke email user.
13. **EisScore**: Rekapitulasi agregasi skor dampak edukasi dan analisis EIS final setiap pengunjung berdasarkan satu sesi utuh.

## Daftar 26 Endpoint API
### Users & Profile
1. `POST /api/v1/users/register`
2. `POST /api/v1/users/request-otp`
3. `POST /api/v1/users/verify-otp`
4. `GET /api/v1/users/profile`

### Visit Sessions
5. `POST /api/v1/sessions/start`
6. `POST /api/v1/sessions/end`
7. `GET /api/v1/sessions/history`

### Quizzes
8. `GET /api/v1/quizzes/fetch`
9. `POST /api/v1/quizzes/submit`
10. `GET /api/v1/quizzes/result/:session_id`
11. `GET /api/v1/quizzes/retention-status`

### Tracking (QR Code & Interaksi)
12. `POST /api/v1/track/checkin`
13. `PATCH /api/v1/track/interact`
14. `POST /api/v1/track/lab-log`
15. `POST /api/v1/track/checkout`

### Retention Scheduler & Kuis Retensi
16. `POST /api/v1/retention/trigger`
17. `GET /api/v1/retention/quiz/:token`
18. `POST /api/v1/retention/submit/:token`

### Analytics & EIS Score
19. `GET /api/v1/analytics/eis/:user_id`
20. `GET /api/v1/analytics/session/:session_id`
21. `GET /api/v1/analytics/dashboard`

### Admin (CMS)
22. `POST /api/v1/admin/exhibits`
23. `GET /api/v1/admin/exhibits`
24. `DELETE /api/v1/admin/exhibits/:exhibit_id`
25. `POST /api/v1/admin/content`
26. `POST /api/v1/admin/media`
27. `POST /api/v1/admin/quizzes`

## Diagram Alur Data

```
[ User / Visitor ] --> [ POST /users/request-otp ] --> [ Receive OTP Code via Resend Email ]
       |
       v
[ Login dengan OTP ] --> [ Dapatkan JWT ]
       |
       v
[ Start VisitSession ] --> [ Kerjakan Kuis PRE_ZOO ]
       |
       v
[ Scan QR Code Exhibit ] --> [ Catat Interaction (Start) ] --> [ Belajar via LearningPathContent & ExhibitMedia ]
       |
       v
[ Catat Aktivitas Media ] --> [ Catat InteractiveLabLog ] --> [ Checkout Exhibit (Stop Interaction Duration) ]
       |
       v
[ Ulangi Check-in ke Exhibit Lain ]
       |
       v
[ End VisitSession ] --> [ Kerjakan Kuis POST_ZOO ] --> [ Kalkulasi Awal EIS (Knowledge & Engagement) ]
       |
       +--> (Membuat Jadwal Kuis Retensi 1W & 1M otomatis di tabel RetentionSchedule)
       |
       v
[ Scheduler cron berjalan harian ] --> [ Cek RetentionSchedule PENDING ]
       |
       v
[ Kirim Email Tautan Kuis Retensi berdasar Token unik ]
       |
       v
[ Visitor submit kuis retensi H+7 / H+30 ] --> [ Re-Kalkulasi EIS Score Keseluruhan ]
       |
       v
[ Analytics: Cek Dashboard & Hasil Report EIS Score Final ]
```
