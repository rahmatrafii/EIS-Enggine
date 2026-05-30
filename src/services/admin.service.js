import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

/**
 * Generate unique random 6 characters suffix
 */
const generateRandomSuffix = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomStr;
};

/**
 * Create a new exhibit
 * @param {Object} data
 * @param {string} data.name - Exhibit name
 * @param {string} data.zoneName - Zone name
 * @param {string} [data.description] - Exhibit description
 */
export const createExhibit = async ({ name, zoneName, description }) => {
  // 1. Cek duplikasi nama kandang (case-insensitive)
  const existingExhibit = await prisma.exhibit.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existingExhibit) {
    throw new AppError(409, 'CONFLICT', 'Nama kandang sudah terdaftar');
  }

  // 2. Generate qrCodeIdentifier
  // Format: EXHIBIT-{NAMA_UPPERCASE}-{RANDOM_6_CHAR}
  // NAMA_UPPERCASE: trim, uppercase, all non-alphanumeric chars to dash
  const nameUppercase = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-');

  let qrCodeIdentifier = `EXHIBIT-${nameUppercase}-${generateRandomSuffix()}`;

  // Try creating in a try-catch block for P2002 uniqueness
  try {
    const newExhibit = await prisma.exhibit.create({
      data: {
        name,
        zoneName,
        description,
        qrCodeIdentifier,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        zoneName: true,
        description: true,
        qrCodeIdentifier: true,
        isActive: true,
        createdAt: true,
      },
    });

    return newExhibit;
  } catch (error) {
    // If it's a Prisma unique constraint violation (P2002), retry once with a fresh code
    if (error.code === 'P2002' && error.meta?.target?.includes('qrCodeIdentifier')) {
      qrCodeIdentifier = `EXHIBIT-${nameUppercase}-${generateRandomSuffix()}`;
      
      const newExhibit = await prisma.exhibit.create({
        data: {
          name,
          zoneName,
          description,
          qrCodeIdentifier,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          zoneName: true,
          description: true,
          qrCodeIdentifier: true,
          isActive: true,
          createdAt: true,
        },
      });
      return newExhibit;
    }
    
    // Otherwise, propagate the original error
    throw error;
  }
};

/**
 * Get all exhibits with optional filters and age category content status
 * @param {Object} filters
 * @param {boolean} [filters.is_active] - Filter by exhibit active status
 * @param {string} [filters.zone_name] - Filter by zone name (case-insensitive)
 */
export const getExhibits = async (filters = {}) => {
  try {
    const { is_active, zone_name } = filters;
    const where = {};

    if (is_active !== undefined) {
      where.isActive = is_active;
    }

    if (zone_name !== undefined && zone_name.trim() !== '') {
      where.zoneName = {
        equals: zone_name.trim(),
        mode: 'insensitive',
      };
    }

    const exhibits = await prisma.exhibit.findMany({
      where,
      include: {
        learningContent: {
          select: {
            ageCategory: true,
          },
        },
        media: {
          select: {
            ageCategory: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return exhibits.map((exhibit) => {
      const contentStatus = {
        CHILD: {
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'CHILD'),
          media: exhibit.media.some((m) => m.ageCategory === 'CHILD'),
        },
        TEEN: {
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'TEEN'),
          media: exhibit.media.some((m) => m.ageCategory === 'TEEN'),
        },
        ADULT: {
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'ADULT'),
          media: exhibit.media.some((m) => m.ageCategory === 'ADULT'),
        },
      };

      return {
        id: exhibit.id,
        name: exhibit.name,
        zoneName: exhibit.zoneName,
        description: exhibit.description,
        qrCodeIdentifier: exhibit.qrCodeIdentifier,
        isActive: exhibit.isActive,
        createdAt: exhibit.createdAt,
        content_status: contentStatus,
      };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat mengambil data kandang'
    );
  }
};

/**
 * Soft delete an exhibit (set isActive = false)
 * @param {number} exhibitId - Exhibit ID
 */
export const deleteExhibit = async (exhibitId) => {
  const exhibit = await prisma.exhibit.findUnique({
    where: { id: exhibitId },
  });

  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
  }

  if (!exhibit.isActive) {
    throw new AppError(409, 'CONFLICT', 'Kandang sudah tidak aktif');
  }

  const updatedExhibit = await prisma.exhibit.update({
    where: { id: exhibitId },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      zoneName: true,
      description: true,
      qrCodeIdentifier: true,
      isActive: true,
      createdAt: true,
    },
  });

  return updatedExhibit;
};

/**
 * Create or update learning content for an exhibit and age category
 * @param {Object} data
 * @param {number} data.exhibitId
 * @param {string} data.ageCategory
 * @param {string} data.contentTitle
 * @param {string} data.contentBody
 */
export const upsertContent = async ({ exhibitId, ageCategory, contentTitle, contentBody }) => {
  try {
    // 1. Cek apakah exhibit ada dan aktif
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: exhibitId },
    });

    if (!exhibit || !exhibit.isActive) {
      throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
    }

    // 2. Gunakan prisma upsert
    const content = await prisma.learningPathContent.upsert({
      where: {
        exhibitId_ageCategory: {
          exhibitId,
          ageCategory,
        },
      },
      update: {
        contentTitle,
        contentBody,
      },
      create: {
        exhibitId,
        ageCategory,
        contentTitle,
        contentBody,
      },
      select: {
        id: true,
        exhibitId: true,
        ageCategory: true,
        contentTitle: true,
        contentBody: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat menyimpan konten edukasi'
    );
  }
};

/**
 * Create media for an exhibit
 * @param {Object} data
 * @param {number} data.exhibitId
 * @param {string} data.ageCategory
 * @param {string} data.mediaType
 * @param {string} data.title
 * @param {string} data.fileUrl
 */
export const createMedia = async ({ exhibitId, ageCategory, mediaType, title, fileUrl }) => {
  try {
    // 1. Cek apakah exhibit ada dan aktif
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: exhibitId },
    });

    if (!exhibit || !exhibit.isActive) {
      throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
    }

    // 2. Simpan media
    const media = await prisma.exhibitMedia.create({
      data: {
        exhibitId,
        ageCategory,
        mediaType,
        title,
        fileUrl,
      },
      select: {
        id: true,
        exhibitId: true,
        ageCategory: true,
        mediaType: true,
        title: true,
        fileUrl: true,
        createdAt: true,
      },
    });

    return media;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat menyimpan media'
    );
  }
};

/**
 * Create a new quiz and its questions atomically using a transaction
 * @param {Object} data
 * @param {number} [data.exhibitId] - Exhibit ID (required if scope is EXHIBIT)
 * @param {string} data.scope - Quiz scope ('GLOBAL' or 'EXHIBIT')
 * @param {string} data.title - Quiz title
 * @param {string} data.quizType - Quiz type ('PRE_ZOO', 'POST_ZOO', 'RETENTION_1W', 'RETENTION_1M')
 * @param {string} data.ageCategory - Age category ('CHILD', 'TEEN', 'ADULT')
 * @param {Array} data.questions - Array of quiz questions
 */
export const createQuiz = async ({ exhibitId, scope, title, quizType, ageCategory, questions }) => {
  // 1. Validasi constraint scope
  if (scope === 'EXHIBIT') {
    if (exhibitId === undefined || exhibitId === null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'exhibitId wajib diisi jika scope adalah EXHIBIT');
    }
    
    // Pastikan exhibit ada dan aktif
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: exhibitId },
    });

    if (!exhibit || !exhibit.isActive) {
      throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
    }
  } else if (scope === 'GLOBAL') {
    if (exhibitId !== undefined && exhibitId !== null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'exhibitId harus null jika scope adalah GLOBAL');
    }
  }

  try {
    // 2. Eksekusi transaksi atomik
    const result = await prisma.$transaction(async (tx) => {
      // 2.1 Buat record Quiz di tabel quizzes
      const quiz = await tx.quiz.create({
        data: {
          exhibitId: scope === 'GLOBAL' ? null : exhibitId,
          scope,
          title,
          quizType,
          ageCategory,
        },
      });

      // 2.2 Petakan soal-soal dan tambahkan ke tabel questions
      const questionsData = questions.map((q) => ({
        quizId: quiz.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        points: q.points ?? 10,
      }));

      const { count } = await tx.question.createMany({
        data: questionsData
      });

      return {
        quizId: quiz.id,
        totalQuestionsAdded: count,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat membuat kuis'
    );
  }
};
