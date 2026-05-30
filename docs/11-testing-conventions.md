# 11. Testing Conventions

Sistem pengujian/testing di EIS Engine menggunakan **Jest** dan **Supertest**. Eksekusi Test memposisikan diri sebagai Unit Testing terhadap Service logic, dan E2E Integration Testing pada endpoint API.

## Aturan Fundamental
1. **Jangan Menyentuh Database Production!**: Jalankan tes HANYA menggunakan instance Database Development/Test yang aman dihancurkan (Wipe out), ATAU Mock fungsi Prisma client menggunakan utilitas `jest.mock`.
2. **Setup ESM**: Modul Express/Prisma diekspor dengan ESM, jalankan test dengan opsi `--experimental-vm-modules`.
3. **Kewajiban 3 Test Case (Minimal)** per-Endpoint:
   - *Positive Case* (Sukses mengeksekusi logika dan membalas 200/201).
   - *Validation Failure* (Gagal karena form body tidak sesuai, membalas 400).
   - *Authentication/Logic Failure* (Gagal karena tidak ada JWT Token, membalas 401 atau gagal spesifik DB membalas 404/409).
4. Penamaan format blok `it` atau `test` WAJIB deskriptif dengan pola: `"should [expected behavior] when [condition]"`.

## Konfigurasi Global `tests/setup.js`
Gunakan berkas setup untuk persiapan inisialisasi lingkungan.
```javascript
// Memastikan NODE_ENV test agar tidak memodifikasi db production tanpa sengaja
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';

// Mock dependensi eksternal untuk menghindari side-effect selama testing cepat
jest.mock('../src/config/prisma.js', () => {
  return {
    __esModule: true,
    default: {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      visitSession: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      // ...tambahkan model lain sesuai kebutuhan per module test...
    }
  };
});
```

## Template dan Contoh Pengujian

### Contoh 1: Endpoint `POST /users/request-otp` (`tests/users.test.js`)
```javascript
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js'; // versi di mock

describe('Users API - POST /api/v1/users/request-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Bersihkan track record antar test
  });

  it('should send OTP and return 200 when email is registered', async () => {
    // Simulasi user ditemukan & di-update
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'user@test.com' });
    prisma.user.update.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/v1/users/request-otp')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('should return 404 when email is not registered', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/users/request-otp')
      .send({ email: 'unknown@test.com' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('should return 400 when body lacks email field', async () => {
    const res = await request(app)
      .post('/api/v1/users/request-otp')
      .send({}); // tanpa properti email

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
```

### Contoh 2: Endpoint Tracking dengan Auth `POST /track/checkin`
Untuk test dengan middleware Auth, buat Helper pembuat Token di dalam scope pengujian.
```javascript
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

const generateTestToken = (userId, role = 'VISITOR') => {
  return jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);
};

describe('Track API - POST /api/v1/track/checkin', () => {
  it('should return 200 and interaction_id when QR valid and Auth valid', async () => {
    const token = generateTestToken(1);
    
    // Mock Data DB Session Aktif dan Exhibit Ada
    prisma.visitSession.findUnique.mockResolvedValue({ id: 50, userId: 1 });
    prisma.exhibit.findUnique.mockResolvedValue({ id: 2, qrCodeIdentifier: 'EXB_LION' });
    prisma.interaction.create.mockResolvedValue({ id: 99 });

    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 50, qrCodeIdentifier: 'EXB_LION' });

    expect(res.status).toBe(201);
    expect(res.body.data.interactionId).toBe(99);
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .send({ sessionId: 50, qrCodeIdentifier: 'EXB_LION' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
```

## Menjalankan Perintah Test
- `npm test`: Jalankan semua file tes 1x eksekusi (Ideal di Pipeline CI/CD).
- `npm run test:watch`: Mengamati file yang diubah dan menguji ulang interaktif.
- `npm run test:coverage`: Eksekusi beserta perolehan statistik cakupan kode (Code Coverage), di mana KPI kita mewajibkan minimum **80%**.
