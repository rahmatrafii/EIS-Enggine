# 05. Auth & OTP Flow

Dokumentasi mengenai tata cara sistem Autentikasi Pengunjung via Email (Passwordless / OTP) dan sistem Autorisasi Proteksi JWT.

## Alur Login OTP (Wajib Diikuti)
1. Pengguna (User) meminta akses log in dengan menembak API `POST /users/request-otp` beserta payload email.
2. Backend akan melakukan generate OTP berupa **6 digit string numerik**.
3. Backend menimpa/menyimpan string OTP tersebut bersama dengan target kedaluwarsa waktu (10 Menit dari sekarang) ke dalam Field Table User: `otpCode` dan `otpExpiresAt`.
4. Backend menggunakan `emailSender.js` memanggil library pihak ketiga **Resend API** mengirimkan email OTP ke pengguna.
5. Pengguna memasukkan OTP di aplikasi Mobile dan menembak API `POST /users/verify-otp` beserta `email` dan `otp`.
6. Backend melakukan validasi verifikasi:
   - Apakah OTP Cocok di database table user?
   - Apakah waktu saat ini kurang dari `otpExpiresAt`?
7. Jika sukses:
   - Ubah Field database `otpCode` & `otpExpiresAt` menjadi NULL (dihapus).
   - Cetak JWT (JsonWebToken)
   - Return token sebagai response ke client.
8. Jika invalid atau OTP Expired, lempar `AppError` code `OTP_INVALID` / `OTP_EXPIRED`.

## Aturan Dasar JWT Utama
Stateless secara penuh (JWT token murni yang tidak divalidasi lewat kecocokan di database table khusus).
- **Payload Struktur JWT**: `{ userId: number, ageCategory: string, role: string }`
- **Masa Berlakunya (Expiry)**: `VISITOR` (7 Hari), `ADMIN` (1 Hari)

### Implementasi `auth.middleware.js` (Pengamanan Umum)
Verifikasi setiap JWT yang disertakan dalam `Authorization: Bearer <TOKEN>`.
```javascript
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/response.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Token akses tidak ditemukan'));
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // tempel object decoded ke request object
    next();
  } catch (error) {
    next(new AppError(401, 'UNAUTHORIZED', 'Token invalid atau kadaluarsa'));
  }
};
```

### Implementasi `adminAuth.middleware.js`
Melindungi resource hanya untuk peran Admin (digunakan di URL `/api/v1/admin/*`).
```javascript
import { AppError } from '../utils/response.js';

export const adminAuthMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Akses ditolak. Memerlukan otorisasi level admin.'));
  }
  next();
};
```

### Implementasi `cronAuth.middleware.js`
Endpoint pemicu dari Vercel/Node-cron hanya dapat diakses melalui pengiriman header yang sah, tanpa menggunakan JWT.
```javascript
import { AppError } from '../utils/response.js';

export const cronAuthMiddleware = (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET_KEY) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Otorisasi scheduler ditolak'));
  }
  next();
};
```

## Aturan Retention Token
Kuis Retensi yang disebar via e-mail diakses oleh pengunjung **TANPA PERLU LOGIN KEMBALI** di aplikasi karena mereka mengeklik Link khusus URL Magic Token.
- Menggunakan secret env terpisah `RETENTION_TOKEN_SECRET` agar tidak tertukar dengan otoritas Login.
- Payload Struktur JWT: `{ userId: number, sessionId: number, quizType: string }`
- Expiry yang lebih panjang: `24h` (24 jam)
- Fungsi pencetakan wajib diletakkan di utilitas `src/utils/tokenUrl.js`.

## Aturan OTP Generator
- Wajib mencetak *6 digit angka acak (numeric string)*.
- Tidak dicetak menggunakan enkripsi/hashing (berhubung OTP sangat short-lived hanya 10 menit, maka plaintext di DB dibolehkan).
- Berkas utilitas `src/utils/otpGenerator.js`
```javascript
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
```
