# 04. API Conventions

Aturan dasar desain API di sistem EIS Engine untuk memastikan output API stabil, mudah diprediksi, dan meminimalisir logic-leaking pada layer arsitektur.

## Base URL
Semua path endpoint harus diawali oleh Base URL dan Versioning.
- `http://localhost:3000/api/v1/`

## HTTP Status Code Standar
Gunakan hanya mapping error HTTP Code berikut secara konsisten:
- `200 OK` (Berhasil ambil data)
- `201 Created` (Berhasil membuat record/data baru)
- `400 Bad Request` (Gagal Zod Validation, OTP Expired, OTP Invalid)
- `401 Unauthorized` (JWT Token absen atau salah / kadaluarsa)
- `403 Forbidden` (Role tidak sesuai. Cth: Visitor paksa hit API Admin)
- `404 Not Found` (Data ID atau parameter spesifik tidak ada di Database)
- `409 Conflict` (Duplicate record DB, Double Submit Quiz, Double Checkout)
- `500 Internal Server Error` (Prisma down, Code Exception)

## Aturan Layer (Sangat Tegas)
1. **Controller TIDAK BOLEH mengandung logika bisnis:** Jangan buat kalkulasi durasi, jangan olah if/else logic data, dsb di controller. Serahkan semua argument data mentah murni kepada fungsi di layer `service`.
2. **Service TIDAK BOLEH memanggil atau meng-import `req` / `res`:** Service menerima objek data JSON dari argumen parameter dan mengembalikan Promise Object JSON murni. Layer service "tidak perlu tahu" apakah itu dari Express Request atau dari Cron.
3. **Penyaringan Response:** Dilarang melempar object model Prisma mentah. Semua API wajib di-filter dari data yang `null`, `undefined`, atau sensitif seperti (`otpCode`).

## Format Response
Kita selalu membungkus body data response dengan utilitas Wrapper `sendSuccess()` dan `sendError()`. Jangan gunakan raw `res.status().json()`.

### `src/utils/response.js` (Implementasi Lengkap)
```javascript
export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const sendSuccess = (res, statusCode, data, message = 'Success') => {
  // Membersihkan field null/undefined sebelum di-encode jika dibutuhkan.
  const cleanedData = JSON.parse(JSON.stringify(data, (key, value) => {
    return value === null ? undefined : value;
  }));

  return res.status(statusCode).json({
    success: true,
    message,
    data: cleanedData
  });
};

export const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    success: false,
    code,
    message
  });
};
```

## Konvensi Pagination
Untuk API Collection List seperti History dan Daftar Admin, gunakan query string:
`?page=1&limit=10`
Service layer wajib melakukan penghitungan pagination secara eksplisit dengan return:
```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

## Daftar Lengkap 26 Endpoint
1. **Users**
   - `POST /api/v1/users/register` - controller: `registerUser`
   - `POST /api/v1/users/request-otp` - controller: `requestOtp`
   - `POST /api/v1/users/verify-otp` - controller: `verifyOtp`
   - `GET /api/v1/users/profile` (auth) - controller: `getUserProfile`
2. **Visit Sessions**
   - `POST /api/v1/sessions/start` (auth) - controller: `startSession`
   - `POST /api/v1/sessions/end` (auth) - controller: `endSession`
   - `GET /api/v1/sessions/history` (auth) - controller: `getSessionHistory`
3. **Quizzes**
   - `GET /api/v1/quizzes/fetch` (auth) - controller: `fetchQuiz`
   - `POST /api/v1/quizzes/submit` (auth) - controller: `submitQuiz`
   - `GET /api/v1/quizzes/result/:session_id` (auth) - controller: `getQuizResult`
   - `GET /api/v1/quizzes/retention-status` (auth) - controller: `getRetentionStatus`
4. **Tracking**
   - `POST /api/v1/track/checkin` (auth) - controller: `checkIn`
   - `PATCH /api/v1/track/interact` (auth) - controller: `logInteraction`
   - `POST /api/v1/track/lab-log` (auth) - controller: `logLabActivity`
   - `POST /api/v1/track/checkout` (auth) - controller: `checkOut`
5. **Retention**
   - `POST /api/v1/retention/trigger` (cronAuth) - controller: `triggerRetention`
   - `GET /api/v1/retention/quiz/:token` - controller: `getRetentionQuiz`
   - `POST /api/v1/retention/submit/:token` - controller: `submitRetentionQuiz`
6. **Analytics & EIS**
   - `GET /api/v1/analytics/eis/:user_id` (auth) - controller: `getEisScore`
   - `GET /api/v1/analytics/session/:session_id` (auth) - controller: `getSessionAnalytics`
   - `GET /api/v1/analytics/dashboard` (adminAuth) - controller: `getDashboard`
7. **Admin (CMS)**
   - `POST /api/v1/admin/exhibits` (adminAuth) - controller: `createExhibit`
   - `GET /api/v1/admin/exhibits` (adminAuth) - controller: `getExhibits`
   - `DELETE /api/v1/admin/exhibits/:exhibit_id` (adminAuth) - controller: `deleteExhibit`
   - `POST /api/v1/admin/content` (adminAuth) - controller: `createContent`
   - `POST /api/v1/admin/media` (adminAuth) - controller: `createMedia`
   - `POST /api/v1/admin/quizzes` (adminAuth) - controller: `createQuiz`
