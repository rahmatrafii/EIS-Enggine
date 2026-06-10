import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/config/prisma.js';
import { triggerRetention } from './src/services/retention.service.js';

async function testRetention() {
  const email = process.argv[2];
  if (!email) {
    console.log('\n❌ Error: Harap masukkan email visitor yang ingin dites.');
    console.log('Contoh penggunaan: node test-retention.js email_kamu@gmail.com\n');
    process.exit(1);
  }

  try {
    console.log(`🔍 Mencari user dengan email: ${email}...`);
    // 1. Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`❌ Error: User dengan email "${email}" tidak ditemukan.`);
      console.log('Pastikan user tersebut sudah mendaftar di sistem.');
      process.exit(1);
    }

    console.log(`✅ User ditemukan: ${user.name} (ID: ${user.id}, Kategori: ${user.ageCategory})`);

    // 2. Cari sesi kunjungan terakhir yang isCompleted = true
    console.log('🔍 Mencari sesi kunjungan terakhir yang sudah diselesaikan...');
    const session = await prisma.visitSession.findFirst({
      where: {
        userId: user.id,
        isCompleted: true
      },
      orderBy: {
        checkOutAt: 'desc'
      }
    });

    if (!session) {
      console.log(`❌ Error: User "${user.name}" belum memiliki sesi kunjungan yang diakhiri/selesai.`);
      console.log('Silakan jalankan simulasi pengakhiran kunjungan di aplikasi terlebih dahulu.');
      process.exit(1);
    }

    console.log(`✅ Sesi ditemukan: ID Sesi ${session.id} (Waktu Checkout: ${session.checkOutAt})`);

    // 3. Ambil jadwal retensi untuk sesi tersebut
    console.log('🔍 Memeriksa jadwal retensi (RetentionSchedule) untuk sesi ini...');
    const schedules = await prisma.retentionSchedule.findMany({
      where: {
        sessionId: session.id
      }
    });

    if (schedules.length === 0) {
      console.log('⚠️ Tidak menemukan jadwal retensi untuk sesi ini. Membuat jadwal baru...');
      await prisma.retentionSchedule.createMany({
        data: [
          {
            userId: user.id,
            sessionId: session.id,
            quizType: 'RETENTION_1W',
            scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // kemarin (siap dikirim)
            status: 'PENDING'
          },
          {
            userId: user.id,
            sessionId: session.id,
            quizType: 'RETENTION_1M',
            scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // kemarin (siap dikirim)
            status: 'PENDING'
          }
        ],
        skipDuplicates: true
      });
      console.log('✅ Berhasil membuat jadwal retensi H+7 (RETENTION_1W) & H+30 (RETENTION_1M) baru dengan tanggal lampau.');
    } else {
      console.log(`✅ Menemukan ${schedules.length} jadwal retensi.`);
      console.log('⚙️ Mengatur ulang tanggal (scheduled_at) menjadi kemarin dan status ke PENDING agar terpilih oleh cron...');
      await prisma.retentionSchedule.updateMany({
        where: {
          sessionId: session.id
        },
        data: {
          status: 'PENDING',
          sentAt: null,
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // kemarin
        }
      });
      console.log('✅ Berhasil mengatur ulang status jadwal retensi.');
    }

    // 4. Jalankan triggerRetention
    console.log('\n🚀 Menjalankan triggerRetention() untuk memproses antrean email...');
    const result = await triggerRetention();

    console.log('\n✨ ===== HASIL UJI COBA EMAIL RETENSI ===== ✨');
    console.log(`👉 Total Jadwal Diproses : ${result.processedCount}`);
    console.log(`👉 Sukses Terkirim       : ${result.successCount}`);
    console.log(`👉 Gagal Terkirim        : ${result.failCount}`);
    console.log('============================================\n');

    if (result.successCount > 0) {
      console.log(`🎉 SUKSES! Silakan cek kotak masuk email ${email} Anda.`);
      console.log('Pastikan juga untuk memeriksa folder Spam/Promosi.');
    } else {
      console.log('⚠️ Tidak ada email yang sukses terkirim. Periksa logs di atas atau pastikan konfigurasi SMTP (.env) sudah benar.');
    }
    
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat melakukan uji coba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRetention();
