import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

// ─── Start Session ─────────────────────────────────────────────────────────────
export const startSession = async (userId) => {
  try {
    // 1. Cek apakah user sudah memiliki sesi aktif yang belum selesai
    const activeSession = await prisma.visitSession.findFirst({
      where: {
        userId,
        isCompleted: false,
      },
    });

    if (activeSession) {
      throw new AppError(
        409,
        'SESSION_ALREADY_ACTIVE',
        'Anda masih memiliki sesi kunjungan yang aktif. Selesaikan sesi sebelumnya terlebih dahulu.'
      );
    }

    // 2. Buat sesi baru
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // normalisasi ke awal hari UTC untuk visitDate

    const newSession = await prisma.visitSession.create({
      data: {
        userId,
        visitDate: today,
        checkInAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        visitDate: true,
        checkInAt: true,
        isCompleted: true,
      },
    });

    return newSession;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Gagal memproses sesi kunjungan');
  }
};

// ─── End Session ───────────────────────────────────────────────────────────────
export const endSession = async (sessionId, userId) => {
  try {
    // 1. Cari sesi berdasarkan ID
    const session = await prisma.visitSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi kunjungan tidak ditemukan');
    }

    // 2. Ownership check — pastikan sesi milik user yang sedang login
    if (session.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke sesi kunjungan ini');
    }

    // 3. Cek apakah sesi sudah pernah diakhiri
    if (session.isCompleted) {
      throw new AppError(400, 'SESSION_ALREADY_ENDED', 'Sesi kunjungan ini sudah diakhiri sebelumnya');
    }

    // 4. Hitung waktu checkout dan tanggal retensi sebelum transaksi
    const checkOutAt = new Date();

    const retentionH7 = new Date(checkOutAt);
    retentionH7.setDate(retentionH7.getDate() + 7);

    const retentionH30 = new Date(checkOutAt);
    retentionH30.setDate(retentionH30.getDate() + 30);

    // 5. [WAJIB] Jalankan update sesi + injeksi retensi secara atomik
    const [updatedSession] = await prisma.$transaction(async (tx) => {
      // 5a. Update sesi — catat waktu checkout dan tandai selesai
      const updated = await tx.visitSession.update({
        where: { id: sessionId },
        data: {
          checkOutAt,
          isCompleted: true,
        },
        select: {
          id: true,
          userId: true,
          visitDate: true,
          checkInAt: true,
          checkOutAt: true,
          isCompleted: true,
        },
      });

      // 5b. Injeksi jadwal retensi H+7 dan H+30
      await tx.retentionSchedule.createMany({
        data: [
          {
            userId,
            sessionId,
            quizType: 'RETENTION_1W',
            scheduledAt: retentionH7,
          },
          {
            userId,
            sessionId,
            quizType: 'RETENTION_1M',
            scheduledAt: retentionH30,
          },
        ],
        skipDuplicates: true,
      });

      return [updated];
    });

    return updatedSession;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Gagal memproses sesi kunjungan');
  }
};

// ─── Get Session History ───────────────────────────────────────────────────────
export const getSessionHistory = async (userId) => {
  try {
    const sessions = await prisma.visitSession.findMany({
      where: { userId },
      include: {
        eisScore: true,
        quizAttempts: {
          where: {
            quiz: {
              quizType: {
                in: ['PRE_ZOO', 'POST_ZOO'],
              },
            },
          },
          include: {
            quiz: true,
          },
        },
      },
      orderBy: { checkInAt: 'desc' },
    });

    return sessions;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Gagal memproses sesi kunjungan');
  }
};
