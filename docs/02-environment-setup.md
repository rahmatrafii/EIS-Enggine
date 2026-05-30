# 02. Environment Setup

Panduan Setup untuk inisialisasi lingkungan kerja project EIS Engine di mesin lokal.

## Prerequisites
- Node.js versi >= 20
- npm versi >= 10
- PostgreSQL database (Via Supabase)

## Langkah Instalasi Step-by-Step

1. Jalankan `npm init -y` untuk menginisiasi default proyek.
2. Modifikasi `package.json` untuk menggunakan ES Modules (ESM). Tambahkan properties berikut:
   ```json
   "type": "module"
   ```
3. Install dependensi utama:
   ```bash
   npm install express @prisma/client prisma jsonwebtoken zod nodemailer node-cron cloudinary multer cors helmet dotenv @prisma/adapter-pg pg
   ```
4. Install dependensi untuk pengembangan (development):
   ```bash
   npm install -D jest supertest nodemon
   ```
5. Setup file environment (salin `cp .env.example .env`).
6. Eksekusi `npx prisma generate` lalu migrasikan / push ke Database Supabase: `npx prisma db push`.

## Isi File `.env.example` Lengkap
```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
ADMIN_JWT_EXPIRES_IN=1d

# OTP
OTP_EXPIRES_MINUTES=10

# Nodemailer (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_gmail@gmail.com

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Scheduler & Retention
CRON_SECRET_KEY=your_cron_secret_key
RETENTION_TOKEN_SECRET=your_retention_token_secret
RETENTION_TOKEN_EXPIRES=24h
BASE_URL=http://localhost:3000
```

## Penjelasan Variabel Environment
- `PORT` & `NODE_ENV`: Port dan environment node project berjalan.
- `DATABASE_URL` & `DIRECT_URL`: String koneksi ke instance Database PostgreSQL (Supabase).
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_JWT_EXPIRES_IN`: Mengatur kriptografi otorisasi JWT Auth, dibedakan untuk visitor dan admin.
- `OTP_EXPIRES_MINUTES`: Lama waktu hingga OTP hangus dan batal digunakan.
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`: Konfigurasi utilitas pengiriman email menggunakan Nodemailer. Catatan: `EMAIL_PASS` diisi dengan Gmail App Password (bukan password Gmail biasa). Cara mendapatkannya: Google Account → Security → 2-Step Verification → App Passwords → Generate.
- `CLOUDINARY_CLOUD_NAME`: Nama cloud dari dashboard Cloudinary
- `CLOUDINARY_API_KEY`: API key dari dashboard Cloudinary
- `CLOUDINARY_API_SECRET`: API secret dari dashboard Cloudinary

Catatan: Supabase tetap ada di `.env` tapi HANYA untuk `DATABASE_URL` dan `DIRECT_URL` (Prisma). Tidak ada lagi Supabase untuk storage.
- `CRON_SECRET_KEY`: Variabel Header Key rahasia agar cron endpoint trigger hanya dapat dilakukan oleh otoritas sistem yang sah.
- `RETENTION_TOKEN_SECRET`: Kunci enkripsi untuk JWT terpisah spesifik untuk pembuatan akses link Quiz Retensi pengguna via Email.

## Inisialisasi Klien Eksternal Menggunakan ESM

### 1. Konfigurasi Prisma (`src/config/prisma.js`)
Penting agar kita tidak menumpuk instance koneksi Prisma. Buat Singleton client ini:

```javascript
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
```

Supabase menggunakan PgBouncer sebagai connection pooler. Prisma adapter-pg diperlukan agar manajemen koneksi kompatibel dengan arsitektur Supabase dan tidak membuka koneksi langsung secara berlebihan.

### 2. Konfigurasi Cloudinary Storage (`src/config/cloudinary.js`)
Inisialisasi dan konfigurasi Cloudinary client untuk upload dan manajemen file media.

```javascript
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

## Konfigurasi Jest untuk ESM (`jest.config.js`)
Diperlukan pengaturan transform khusus untuk menggunakan sintaks ES Module saat menjalankan test Jest.

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
```
Serta menambahkan flag di skrip `package.json`:
```json
"scripts": {
  "test": "NODE_OPTIONS=--experimental-vm-modules jest",
  "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
  "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
}
```

## Menjalankan Project dan Tes
- Jalankan project local (Development): `npx nodemon server.js` atau tambahkan di script `package.json` `"dev": "nodemon server.js"`
- Jalankan migrasi Prisma (Supabase): `npx prisma db push`
- Menjalankan testing: `npm run test`
