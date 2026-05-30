import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

export const checkIn = async (userId, sessionId, qrCodeIdentifier) => {
  // 1. Dapatkan info user untuk mengambil ageCategory
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ageCategory: true }
  });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  // 2. Validasi sesi
  const session = await prisma.visitSession.findUnique({
    where: { id: sessionId }
  });
  if (!session || session.userId !== userId) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan atau bukan milik Anda');
  }
  if (session.isCompleted) {
    throw new AppError(400, 'SESSION_COMPLETED', 'Sesi sudah selesai, tidak bisa check-in');
  }

  // 3. Cari exhibit berdasarkan qrCodeIdentifier
  const exhibit = await prisma.exhibit.findUnique({
    where: { qrCodeIdentifier }
  });
  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Exhibit tidak ditemukan');
  }
  if (!exhibit.isActive) {
    throw new AppError(400, 'EXHIBIT_INACTIVE', 'Exhibit sedang tidak aktif');
  }

  // 4. Catat interaksi baru tanpa memblokir jika pengguna lupa check-out dari exhibit lain
  const interaction = await prisma.interaction.create({
    data: {
      sessionId,
      userId,
      exhibitId: exhibit.id,
      startTime: new Date()
    }
  });

  // 5. Ambil konten edukasi sesuai umur (LearningPathContent)
  const learningContents = await prisma.learningPathContent.findMany({
    where: {
      exhibitId: exhibit.id,
      ageCategory: user.ageCategory
    },
    select: {
      id: true,
      contentTitle: true,
      contentBody: true,
      createdAt: true
    }
  });

  // 6. Ambil quiz khusus exhibit ini (EXHIBIT scope atau terkait exhibit) dan sesuai umur, tanpa correctOption
  const quizzes = await prisma.quiz.findMany({
    where: {
      exhibitId: exhibit.id,
      ageCategory: user.ageCategory
    },
    include: {
      questions: {
        select: {
          id: true,
          quizId: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          points: true,
          createdAt: true
        }
      }
    }
  });

  return {
    interaction,
    exhibit: {
      id: exhibit.id,
      name: exhibit.name,
      zoneName: exhibit.zoneName,
      description: exhibit.description
    },
    learningContents,
    quizzes
  };
};

export const interact = async (userId, interactionId, mediaType) => {
  // 1. Cek interaksi
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId }
  });
  if (!interaction) {
    throw new AppError(404, 'INTERACTION_NOT_FOUND', 'Interaksi tidak ditemukan');
  }
  if (interaction.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke interaksi ini');
  }

  // 2. Tentukan update object berdasarkan mediaType
  const updateData = {};
  if (mediaType === 'AUDIO') {
    updateData.clickedAudio = true;
  } else if (mediaType === 'VIDEO') {
    updateData.clickedVideo = true;
  } else if (mediaType === 'IMAGE_INFOGRAPHIC') {
    updateData.clickedVisual = true;
  } else if (mediaType === 'INTERACTIVE_LAB') {
    updateData.clickedInteractive = true;
  }

  // 3. Update data
  const updatedInteraction = await prisma.interaction.update({
    where: { id: interactionId },
    data: updateData
  });

  return updatedInteraction;
};

export const labLog = async (userId, interactionId, gameName, actionTaken, scoreAchieved) => {
  try {
    // 1. Cek interaksi
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId }
    });
    if (!interaction) {
      throw new AppError(404, 'INTERACTION_NOT_FOUND', 'Interaksi tidak ditemukan');
    }
    if (interaction.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke interaksi ini');
    }

    // 2. Buat record lab log baru
    const labLogEntry = await prisma.interactiveLabLog.create({
      data: {
        interactionId,
        gameName,
        actionTaken,
        scoreAchieved: scoreAchieved ?? 0
      }
    });

    return labLogEntry;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mencatat lab log');
  }
};

export const checkOut = async (userId, interactionId) => {
  try {
    // 1. Cari interaction berdasarkan ID
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId }
    });
    if (!interaction) {
      throw new AppError(404, 'INTERACTION_NOT_FOUND', 'Interaksi tidak ditemukan');
    }

    // 2. Ownership check — pastikan interaction milik user yang sedang login
    if (interaction.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke interaksi ini');
    }

    // 3. Cek apakah interaction sudah di-checkout (sudah punya endTime)
    if (interaction.endTime) {
      throw new AppError(409, 'INTERACTION_ALREADY_CLOSED', 'Interaksi sudah ditutup sebelumnya');
    }

    // 4. Hitung duration_seconds = selisih endTime dan startTime dalam detik
    const now = new Date();
    const durationSeconds = Math.floor((now - new Date(interaction.startTime)) / 1000);

    // 5. Update interaction dengan endTime dan durationSeconds
    const updatedInteraction = await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        endTime: now,
        durationSeconds
      }
    });

    return updatedInteraction;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat checkout interaksi');
  }
};
