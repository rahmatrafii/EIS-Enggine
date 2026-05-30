# 08. Service Layer Conventions

`Service` Layer adalah Jantung Pusat (Core) di dalam backend EIS Engine. Mayoritas baris dan kerumitan koding akan bermukim di sini.

## Tanggung Jawab Service
- Eksekusi murni dari aturan logika bisnis (Businness Rule & Rules Engine Algoritma).
- Interaksi satu-satunya dengan Data Access Layer Database ORM (`prisma.*`).
- Menjalankan fungsi kalkulasi (Perhitungan nilai Skor EIS atau Skor durasi sesi).

## Aturan Mutlak
1. Service WAJIB membuang / Throwing class custom `AppError` secara langsung pada logika bisnis yang gagal, bukan me-return NULL lalu membiarkan Controller yang menanganinya.
2. Dilarang meng-inject object express `req` atau `res` ke parameter fungsi service.
3. Fungsi Service cukup Return suatu objek data object JSON plain biasa, bukan Model Object prisma murni yang menyembunyikan properti internal (terutama filter field sensitif terlebih dahulu sebelum me-return).
4. Tindakan lintas multi-tabel dalam satu kali operasi WAJIB memanfaatkan `prisma.$transaction([])` dengan dilengkapi komentar pada setiap baris indeks urutannya.

## Contoh Template Penggunaan Service Lengkap

### Contoh 1: Fungsi Registrasi User (`users.service.js`)
Service harus menampung logika perlakuan untuk pengecekan data di DB (Email unique), menimbang rentang umur (`ageCategory`), menyimpan di DB, dan return final object tanpa data password.
```javascript
import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { determineAgeCategory } from '../utils/ageCategory.js';

export const registerUser = async (name, email, age) => {
  // 1. Cek duplikasi email dari database
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email ini telah terdaftar di sistem');
  }

  // 2. Kalkulasi bisnis umur
  const ageCategory = determineAgeCategory(age);

  // 3. Masukkan entitas tabel
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      age,
      ageCategory
    },
    select: {
      id: true,
      name: true,
      email: true,
      ageCategory: true
      // otpCode otomatis difilter dan tidak di-select di sini
    }
  });

  return newUser;
};
```

### Contoh 2: Fungsi Start Session (`sessions.service.js`)
```javascript
import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

export const startSession = async (userId) => {
  // 1. Cek sesi aktif agar visitor tidak bisa multi-session login hari ini.
  const activeSession = await prisma.visitSession.findFirst({
    where: { 
      userId, 
      isCompleted: false 
    }
  });

  if (activeSession) {
    throw new AppError(409, 'SESSION_ALREADY_ACTIVE', 'Anda masih memiliki sesi kunjungan yang belum Check-Out');
  }

  // 2. Buat sesi
  const newSession = await prisma.visitSession.create({
    data: {
      userId,
      visitDate: new Date()
    }
  });

  return {
    sessionId: newSession.id,
    checkInAt: newSession.checkInAt
  };
};
```

### Contoh 3: Submit Kuis (Transaction Multi Langkah) (`quizzes.service.js`)
```javascript
import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { recalculateEis } from './eis.service.js'; // trigger ulang eis

export const submitQuiz = async (userId, sessionId, quizId, answersPayload) => {
  // Validasi sesi
  const session = await prisma.visitSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak valid');
  }

  // Cek apakah pernah submit kuis yang sama di sesi ini
  const existingAttempt = await prisma.userQuizAttempt.findFirst({
    where: { sessionId, quizId }
  });
  if (existingAttempt) {
    throw new AppError(409, 'QUIZ_ALREADY_SUBMITTED', 'Anda sudah mengambil kuis ini');
  }

  // Cek validasi Quiz Questions
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true }
  });
  
  if (!quiz) throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan');

  // Lakukan logika koreksi array answersPayload yang dikirim user
  let correctCount = 0;
  let finalScore = 0;
  const answerEntries = answersPayload.map(userAns => {
    const dbQuestion = quiz.questions.find(q => q.id === userAns.questionId);
    const isCorrect = dbQuestion && (dbQuestion.correctOption === userAns.chosenOption);
    
    if (isCorrect) {
      correctCount++;
      finalScore += dbQuestion.points;
    }
    
    return {
      questionId: userAns.questionId,
      chosenOption: userAns.chosenOption,
      isCorrect
    };
  });

  // Operasi multi-langkah transaksi 
  const result = await prisma.$transaction(async (tx) => {
    // 1. Rekam jejak upaya (Attempt)
    const attempt = await tx.userQuizAttempt.create({
      data: {
        userId,
        sessionId,
        quizId,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        finalScore,
        completedAt: new Date()
      }
    });

    // 2. Rekam massal detail soal
    const detailedAnswersData = answerEntries.map(ans => ({
      ...ans,
      attemptId: attempt.id
    }));
    await tx.userQuizAnswer.createMany({ data: detailedAnswersData });

    return attempt;
  });

  // 3. Trigger Async: Kalkulasi recalculation EIS apabila ini kuis final zoo.
  if (quiz.quizType === 'POST_ZOO') {
     // tidak await atau ditangkap catch-nya (run-and-forget background operation)
     recalculateEis(userId, sessionId).catch(console.error);
  }

  return result;
};
```

## Konvensi Penggunaan Cloudinary

**Aturan wajib:**
- File media (gambar, audio, video, file JSON interaktif) WAJIB diupload ke Cloudinary — TIDAK BOLEH disimpan di server lokal atau database
- Kolom `fileUrl` di tabel `exhibit_media` hanya menyimpan URL hasil upload dari Cloudinary
- Upload file ke Cloudinary dilakukan dari backend menggunakan Cloudinary Node.js SDK (`cloudinary` package)
- Gunakan `upload_stream` untuk upload dari buffer (multipart form), bukan dari path file lokal

**Struktur folder di Cloudinary (wajib diikuti):**
```
eis-engine/
├── exhibits/
│   ├── audio/        ← file audio satwa (.mp3, .wav)
│   ├── video/        ← file video satwa (.mp4)
│   ├── images/       ← gambar dan infografis (.jpg, .png, .webp)
│   └── interactive/  ← file JSON/asset game interaktif
```

**Cara inisialisasi Cloudinary client di `src/config/cloudinary.js`:**
```javascript
import { v2 as cloudinary } from 'cloudinary'
import 'dotenv/config'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary
```

**Contoh fungsi upload di service (gunakan ini sebagai standar):**
```javascript
import cloudinary from '../config/cloudinary.js'

export async function uploadMediaToCloudinary(fileBuffer, mediaType, exhibitName) {
  const folder = `eis-engine/exhibits/${mediaType.toLowerCase()}`

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // otomatis deteksi image/video/raw
        public_id: `${exhibitName}_${Date.now()}`,
      },
      (error, result) => {
        if (error) reject(new AppError(500, 'UPLOAD_FAILED', 'Gagal mengupload file ke Cloudinary'))
        else resolve(result.secure_url) // simpan URL ini ke kolom fileUrl di DB
      }
    )
    uploadStream.end(fileBuffer)
  })
}
```

**Aturan tambahan:**
- Selalu gunakan `result.secure_url` (HTTPS) — jangan gunakan `result.url`
- Tambahkan dependency `multer` untuk menerima file upload dari request (`multipart/form-data`)
- Endpoint yang menerima file upload adalah `POST /admin/media`
- Validasi tipe file di middleware sebelum upload: hanya izinkan `image/*`, `audio/*`, `video/*`, `application/json`
- Maksimal ukuran file: 50MB (konfigurasi di multer)
