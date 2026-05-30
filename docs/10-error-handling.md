# 10. Error Handling

Untuk memastikan format balasan Error API stabil dan seragam, seluruh error di EIS Engine ditangani secara terpusat (Centralized Error Handling).

## Custom Class AppError
Semua service, controller, dan middleware custom tidak diperbolehkan melempar `throw new Error()` JavaScript murni. Wajib menggunakan `AppError` yang didefinisikan di `src/utils/response.js`.
```javascript
export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    // Perekaman stack trace, dikecualikan dari constructor ini sendiri
    Error.captureStackTrace(this, this.constructor);
  }
}
```

## Central Error Handler Middleware (`error.middleware.js`)
Pusat pencegat error (interceptor). Ditulis dengan 4 parameter mutlak `(err, req, res, next)` dan didaftarkan paling akhir dalam `app.js`.
```javascript
import { AppError, sendError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, code, message } = err;

  // Tangkap Error Bawaan Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'Data yang anda masukkan telah ada di database (Duplikat).';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Record data tidak ditemukan di database.';
    }
  }

  // Jika error bukan instansiasi AppError (e.g., error library/sintaks)
  if (!statusCode) {
    statusCode = 500;
    code = 'INTERNAL_ERROR';
    message = 'Terjadi kesalahan sistem di server.';
  }

  // Logging di lingkungan development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${code}: ${message}`, err.stack);
  }

  // JANGAN mengekspos stack trace mentah ke client di Production
  return sendError(res, statusCode, code, message);
};
```

## Daftar Kode Error Standar (Wajib Digunakan)
Agar Frontend atau Mobile App mudah membedakan error, kirim balasan string `code` yang konsisten berikut ini. DILARANG membuat format kode asal-asalan.

| Kode Teks | HTTP Status | Keterangan |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Data JSON tidak sesuai schema Zod |
| `UNAUTHORIZED` | 401 | Token JWT kadaluarsa, salah, atau tidak ada |
| `FORBIDDEN` | 403 | Visitor mencoba akses API Admin |
| `NOT_FOUND` | 404 | Data tidak ada (Misal ID Exhibit salah) |
| `CONFLICT` | 409 | Pelanggaran Unique DB Constraint |
| `INTERNAL_ERROR` | 500 | Server/DB drop atau Code crash |
| `EMAIL_ALREADY_EXISTS` | 409 | Registrasi pengguna duplikat |
| `OTP_INVALID` | 400 | Angka OTP salah diketik |
| `OTP_EXPIRED` | 400 | OTP lebih dari 10 Menit |
| `SESSION_NOT_FOUND` | 404 | User tidak sedang memiliki sesi jalan |
| `SESSION_ALREADY_ACTIVE` | 409 | User lupa check-out dari sesi sebelumnya |
| `QUIZ_ALREADY_SUBMITTED` | 409 | Visitor submit lebih dari 1 kali (Double submit) |
| `QUIZ_NOT_FOUND` | 404 | ID Kuis hilang/salah |
| `INTERACTION_NOT_FOUND` | 404 | Belum ada check-in exhibit namun checkout |
| `INTERACTION_ALREADY_CLOSED` | 409 | Durasi interaksi sudah dihentikan |
| `RETENTION_EXPIRED` | 400 | Token Retention sudah lewat masa 24 Jam |
| `RETENTION_ALREADY_DONE` | 409 | Kuis H+7 / H+30 sudah pernah dikerjakan |
| `EXHIBIT_NOT_FOUND` | 404 | QR Scan mengarah ke nama Exhibit invalid |
