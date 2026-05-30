# 12. Scheduler Conventions

Modul pengingat Kuis Retensi berpusat pada sebuah background worker (cron jobs) menggunakan pustaka `node-cron`. 

## Logika Bisnis Scheduler
Ketika pengguna mengakhiri Sesi (Check-out kebun binatang), sistem menyuntik antrean 2 buah row pada tabel `RetentionSchedule` (Status `PENDING`, tipe `RETENTION_1W` dan `RETENTION_1M`).

Scheduler kita bertugas berjalan satu hari sekali secara statis, mendeteksi semua entri yang waktunya telah jatuh tempo (`scheduledAt <= SEKARANG()`), merakit URL tautan Kuis Retensi unik, mengirimnya via Email, lalu mengubah status entri tersebut menjadi `SENT`.

## Jadwal Cron
Jadwal Cron Expression yang dieksekusi: `0 7 * * *` (Setiap Hari tepat Pukul 07:00 WIB/Server Time).

## Tata Cara Implementasi (`src/scheduler/retention.scheduler.js`)
File module menggunakan sintaks ESM. Aturan ketatnya: **Jangan hentikan sisa antrean batch email apabila salah satu baris pengiriman email mengalami error SMTP.** Isolasi `try/catch` per elemen array!

```javascript
import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { generateRetentionToken } from '../utils/tokenUrl.js';
import { sendEmail } from '../utils/emailSender.js';

export const startRetentionCron = () => {
  // Jadwal Pukul 07:00
  cron.schedule('0 7 * * *', async () => {
    console.log(`[CRON] Memulai eksekusi antrean email retensi pada: ${new Date().toISOString()}`);
    try {
      // 1. Ambil jadwal yang tertunda dan sudah waktunya
      const pendingSchedules = await prisma.retentionSchedule.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: new Date() } // <= NOW()
        },
        include: { user: true }
      });

      if (pendingSchedules.length === 0) {
        console.log('[CRON] Tidak ada email retensi dalam antrean hari ini.');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // 2. Loop Setiap baris antrean secara paralel/satu-per-satu
      for (const schedule of pendingSchedules) {
        // PERHATIAN: Letakkan try catch di DALAM loop agar loop tidak crash total.
        try {
          const { user, sessionId, quizType } = schedule;
          
          // 3. Generate token retensi khusus (expiry 24h)
          const token = generateRetentionToken(user.id, sessionId, quizType);
          
          // 4. Bangun URL Aplikasi
          const baseUrl = process.env.BASE_URL;
          const quizUrl = `${baseUrl}/api/v1/retention/quiz/${token}`;

          // 5. Template HTML Email Sederhana & Kirim
          const emailHtml = `
            <h2>Waktunya Mengingat Petualangan Anda!</h2>
            <p>Halo ${user.name}, mari uji seberapa banyak Anda mengingat hal menarik tentang fauna kebun binatang.</p>
            <a href="${quizUrl}" style="padding:10px 15px; background:blue; color:white;">Mulai Kuis Retensi</a>
            <p>Kuis ini hanya berlaku selama 24 Jam.</p>
          `;
          await sendEmail({
            to: user.email,
            subject: 'Zoo Companion - Kuis Retensi Anda Menunggu!',
            html: emailHtml
          });

          // 6. Update Database ke Status SENT
          await prisma.retentionSchedule.update({
            where: { id: schedule.id },
            data: { status: 'SENT', sentAt: new Date() }
          });
          
          successCount++;
        } catch (mailError) {
          console.error(`[CRON ERROR] Gagal mengirim ke user ID ${schedule.userId}:`, mailError.message);
          failCount++;
        }
      }

      // 7. Log Konklusi batch harian
      console.log(`[CRON] Selesai. Total antrean: ${pendingSchedules.length}. Sukses terkirim: ${successCount}. Gagal: ${failCount}.`);
    } catch (dbError) {
      console.error('[CRON FATAL] Error Query Database di Cron:', dbError.message);
    }
  });
};
```

## Memasangkan Cron di `server.js`
Inisialisasi daemon Scheduler harus dilakukan tepat sebelum instance Express mendengarkan port.
```javascript
import app from './src/app.js';
import { startRetentionCron } from './src/scheduler/retention.scheduler.js';

const PORT = process.env.PORT || 3000;

// Jalankan Daemon Cron Jobs
startRetentionCron();

app.listen(PORT, () => {
  console.log(`[SERVER] API berjalan di http://localhost:${PORT}`);
});
```

## Implementasi Pengirim Email via Nodemailer (`src/utils/emailSender.js`)
Gunakan pustaka `nodemailer` dan ESM Export.
```javascript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Mengirim email menggunakan Nodemailer
 * @param {{ to: string, subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"EIS Engine" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  })

  return info
}
```
