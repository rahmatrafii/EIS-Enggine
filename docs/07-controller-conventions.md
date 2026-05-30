# 07. Controller Conventions

Tugas utama `Controller` hanyalah menjadi *"Traffic Cop"* (pengatur lalu lintas request HTTP dan respon balikan HTTP). 

## Tanggung Jawab Utama
- Ekstraksi argument (Mengambil data JSON body dari `req.body`, URL params dari `req.params`, querystrings dari `req.query`, maupun user login object dari JWT header `req.user`).
- Menyerahkan data hasil ekstraksi tersebut **seutuhnya** kepada fungsi logika dari layer Service.
- Menerima hasil balasan (Data) dari layer Service.
- Membalas response JSON menggunakan library utlitas `sendSuccess()`.
- Menangkap dan meneruskan error lewat instruksi `next(error)` kepada middleware error global di `app.js`.

## Aturan Mutlak
1. Controller **WAJIB** `async`.
2. Seluruh baris eksekusi di dalam fungsi Controller **WAJIB** dibungkus utuh oleh `try { ... } catch(error) { ... }`.
3. Pada blok `catch`, controller JANGAN MERESPON `res.status(500).json()`. Melainkan wajib dipassdown ke `next(error)`.
4. Export di seluruh controller harus menggunakan "Named Export" ESM `export const functionName`, bukan `export default object`.

## Contoh Template Penggunaan Controllers Lengkap

### Contoh 1: Request OTP dan Verify OTP (`users.controller.js`)
```javascript
import * as usersService from '../services/users.service.js';
import { sendSuccess } from '../utils/response.js';

export const requestOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Service hanya butuh email
    const result = await usersService.requestOtp(email);
    
    return sendSuccess(res, 200, result, 'OTP berhasil dikirim ke email');
  } catch (error) {
    next(error); // Lempar ke middleware Error Handler terpusat
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    const tokenPayload = await usersService.verifyOtp(email, otp);
    
    return sendSuccess(res, 200, tokenPayload, 'Verifikasi sukses. JWT Token diterbitkan.');
  } catch (error) {
    next(error);
  }
};
```

### Contoh 2: Start Session (Mengakses Objek Auth JWT dari Header)
Pada `sessions.controller.js`
```javascript
import * as sessionsService from '../services/sessions.service.js';
import { sendSuccess } from '../utils/response.js';

export const startSession = async (req, res, next) => {
  try {
    // JWT Payload telah disuntikkan oleh auth.middleware di app.js
    const userId = req.user.userId; 
    
    // Menghindari passing parameter `req` pada fungsi service
    const sessionData = await sessionsService.startSession(userId);
    
    return sendSuccess(res, 201, sessionData, 'Sesi Kunjungan telah dimulai, mohon kerjakan Kuis Pre-Zoo');
  } catch (error) {
    next(error);
  }
};
```
