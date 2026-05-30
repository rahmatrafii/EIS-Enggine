# 03. Prisma Conventions

Dalam EIS Engine, kita mengaplikasikan operasi ORM menggunakan arsitektur service pattern. Berikut adalah aturan yang wajib dipatuhi saat bekerja dengan Prisma.

## Singleton Import (ESM)
Jangan pernah melakukan inisiasi (`new PrismaClient()`) di dalam file selain konfigurasi.
- **Cara import Prisma client**: `import prisma from '../config/prisma.js'`

## Aturan Lokasi Query Prisma
**Semua operasi database (query Prisma) HANYA boleh diletakkan di layer Service.**
Dilarang memanggil `prisma.*` di Controllers atau Middleware.

## Field Mapping dan Nama Model
- Kita telah memetakan penulisan properti Prisma menggunakan nama camelCase, walaupun nama aslinya di DB menggunakan snake_case (`@map`).
- **Aturan:** SELALU gunakan field model versi camelCase saat menulis query. Contoh: gunakan `ageCategory`, bukan `age_category`.
- **Relasi model include/select**: Pilih hanya data relevan dengan menggunakan parameter `select` maupun `include` agar respons request menjadi efisien.

## Struktur Service Query Standar (Try/Catch)
Semua aksi prisma harus dilindungi try catch block di service dan segera memanggil error sistem kita saat ditemui `PrismaClientKnownRequestError` spesifik.

```javascript
import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

export const getUserById = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User tidak ditemukan');
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data user');
  }
};
```

## Prisma Transaction (Aksi Multi-Tabel)
Jika operasi query bergantung satu sama lain dan mengharuskan kondisi "atomik" (sukses semua atau gagal semua), wajib gunakan `prisma.$transaction`.

```javascript
export const checkOutFromExhibit = async (interactionId, duration) => {
  try {
    // 1. Jalankan semua query di dalam transaksi
    const result = await prisma.$transaction([
      prisma.interaction.update({
        where: { id: interactionId },
        data: { endTime: new Date(), durationSeconds: duration }
      }),
      prisma.interactiveLabLog.updateMany({
        where: { interactionId: interactionId },
        data: { loggedAt: new Date() }
      })
    ]);
    return result;
  } catch (error) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Gagal memproses transaksi checkout');
  }
};
```

## Menangani Prisma Error Code Khusus
Kita dilarang mengekspos object asli Prisma Error ke balasan/response client HTTP. Tangkap kode konvensi di layer blok `catch`:
- Kode **P2002**: Unique Constraint Violation (Duplikat Data). Buang error: `new AppError(409, 'CONFLICT', 'Data sudah digunakan (Contoh: Email ini sudah terdaftar)')`
- Kode **P2025**: Record Not Found (Gagal operasi update/delete pada ID yang tidak ada). Buang error: `new AppError(404, 'NOT_FOUND', 'Record tidak ditemukan untuk diperbarui')`

## Contoh Operasi Lanjutan (Upsert)
Gunakan `upsert` untuk Insert atau Update tanpa query ganda:
```javascript
const userScore = await prisma.eisScore.upsert({
  where: { sessionId: currentSessionId },
  update: { preZooScore: newScore, updatedAt: new Date() },
  create: {
    userId: currentUserId,
    sessionId: currentSessionId,
    preZooScore: newScore
  }
});
```
