# 01. Folder Structure

Setiap komponen sistem dalam EIS Engine didesain menggunakan pendekatan yang terstruktur untuk memastikan skalabilitas dan isolasi logika bisnis. Berikut merupakan struktur direktori project yang WAJIB digunakan:

```
eis-engine/
├── docs/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── prisma.js          ← Prisma client singleton
│   │   └── cloudinary.js      ← Inisialisasi dan konfigurasi Cloudinary client untuk upload dan manajemen file media.
│   ├── routes/
│   │   ├── users.routes.js
│   │   ├── sessions.routes.js
│   │   ├── quizzes.routes.js
│   │   ├── track.routes.js
│   │   ├── retention.routes.js
│   │   ├── analytics.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── users.controller.js
│   │   ├── sessions.controller.js
│   │   ├── quizzes.controller.js
│   │   ├── track.controller.js
│   │   ├── retention.controller.js
│   │   ├── analytics.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── users.service.js
│   │   ├── sessions.service.js
│   │   ├── quizzes.service.js
│   │   ├── track.service.js
│   │   ├── retention.service.js
│   │   ├── analytics.service.js
│   │   ├── eis.service.js
│   │   └── admin.service.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── adminAuth.middleware.js
│   │   ├── cronAuth.middleware.js
│   │   └── validate.middleware.js
│   ├── validators/
│   │   ├── users.validator.js
│   │   ├── sessions.validator.js
│   │   ├── quizzes.validator.js
│   │   ├── track.validator.js
│   │   └── admin.validator.js
│   ├── utils/
│   │   ├── response.js
│   │   ├── ageCategory.js
│   │   ├── tokenUrl.js
│   │   ├── otpGenerator.js
│   │   ├── emailSender.js
│   │   └── eisCalculator.js
│   ├── scheduler/
│   │   └── retention.scheduler.js
│   └── app.js
├── tests/
│   ├── setup.js
│   ├── users.test.js
│   ├── sessions.test.js
│   ├── quizzes.test.js
│   ├── track.test.js
│   ├── retention.test.js
│   └── analytics.test.js
├── .env
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
└── server.js
```

## Tanggung Jawab Masing-Masing Folder
- **docs/**: Berisi semua SOP pengembangan dan referensi sumber kebenaran (Source of Truth) bagi pengembang.
- **prisma/**: Menyimpan deklarasi skema ORM Prisma yang akan menjadi struktur utama Database.
- **src/config/**: Tempat inisialisasi awal klien (clients) instance terpusat, seperti ORM Prisma dan driver Storage Cloudinary.
- **src/routes/**: Memuat file pemetaan Endpoint dari path API ke pemanggilan Middleware maupun Controllers.
- **src/controllers/**: Menangani ekstraksi request HTTP, menyerahkan pemrosesan logika pada Service, dan mengembalikan balasan (response) ke Client.
- **src/services/**: Core engine yang memuat seluruh logika bisnis murni, kalkulasi, perhitungan, dan eksekusi query ORM.
- **src/middleware/**: Filter perantara untuk autentikasi token, validasi schema body, dan error handling global.
- **src/validators/**: Wadah untuk aturan schema pengecekan validasi data object request menggunakan pustaka Zod.
- **src/utils/**: Kumpulan utilitas kecil berupa helper independen untuk generate OTP, Kalkulasi EIS, formatter standar, dan lainnya.
- **src/scheduler/**: Tempat bagi modul Node-Cron untuk mengeksekusi logika batch secara berkala di latar belakang aplikasi.
- **tests/**: Mengandung skrip Unit & End-to-End Test (E2E) bagi API dengan standard library Jest dan Supertest.
