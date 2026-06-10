import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/config/prisma.js';

async function deleteUser() {
  const email = 'rahmatrafiindrayani5555@gmail.com';
  
  try {
    console.log(`🔍 Mencari user dengan email: ${email}...`);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ Error: User dengan email "${email}" tidak ditemukan.`);
      process.exit(0);
    }

    console.log(`✅ User ditemukan: ${user.name} (ID: ${user.id}).`);
    console.log(`⚠️ Menghapus user dan semua relasi terkait (sessions, quiz attempts, retention schedules, scores, dll)...`);
    
    const deletedUser = await prisma.user.delete({
      where: { email },
    });

    console.log(`🎉 Sukses! User "${deletedUser.name}" dengan email "${email}" telah berhasil dihapus beserta seluruh datanya.`);
  } catch (error) {
    console.error('❌ Gagal menghapus user:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
