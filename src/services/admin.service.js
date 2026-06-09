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
export const createExhibit = async ({ name, zoneName, description, imageUrl }) => {
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
  // Format: EXH-{NAMA_UPPERCASE_MAX15}-{RANDOM_6_CHAR}
  // NAMA_UPPERCASE: trim, uppercase, all non-alphanumeric chars to dash, max 15 chars
  const nameUppercase = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 15)
    .replace(/-$/, '');

  let qrCodeIdentifier = `EXH-${nameUppercase}-${generateRandomSuffix()}`;

  // Try creating in a try-catch block for P2002 uniqueness
  try {
    const newExhibit = await prisma.exhibit.create({
      data: {
        name,
        zoneName,
        description,
        imageUrl,
        qrCodeIdentifier,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        zoneName: true,
        description: true,
        imageUrl: true,
        qrCodeIdentifier: true,
        isActive: true,
        createdAt: true,
      },
    });

    return newExhibit;
  } catch (error) {
    // If it's a Prisma unique constraint violation (P2002), retry once with a fresh code
    if (error.code === 'P2002' && error.meta?.target?.includes('qrCodeIdentifier')) {
      qrCodeIdentifier = `EXH-${nameUppercase}-${generateRandomSuffix()}`;
      
      const newExhibit = await prisma.exhibit.create({
        data: {
          name,
          zoneName,
          description,
          imageUrl,
          qrCodeIdentifier,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          zoneName: true,
          description: true,
          imageUrl: true,
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
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'CHILD' || lc.ageCategory === 'ALL'),
          media: exhibit.media.some((m) => m.ageCategory === 'CHILD' || m.ageCategory === 'ALL'),
        },
        TEEN: {
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'TEEN' || lc.ageCategory === 'ALL'),
          media: exhibit.media.some((m) => m.ageCategory === 'TEEN' || m.ageCategory === 'ALL'),
        },
        ADULT: {
          text: exhibit.learningContent.some((lc) => lc.ageCategory === 'ADULT' || lc.ageCategory === 'ALL'),
          media: exhibit.media.some((m) => m.ageCategory === 'ADULT' || m.ageCategory === 'ALL'),
        },
      };

      return {
        id: exhibit.id,
        name: exhibit.name,
        zoneName: exhibit.zoneName,
        description: exhibit.description,
        imageUrl: exhibit.imageUrl,
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
 * Update exhibit basic info
 * @param {number} exhibitId - Exhibit ID
 * @param {Object} data - Update data
 * @param {string} data.name - Exhibit name
 * @param {string} data.zoneName - Zone name
 * @param {string} [data.description] - Exhibit description
 */
export const updateExhibit = async (exhibitId, { name, zoneName, description, imageUrl }) => {
  const exhibit = await prisma.exhibit.findUnique({
    where: { id: exhibitId },
  });

  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
  }

  if (name.toLowerCase() !== exhibit.name.toLowerCase()) {
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
  }

  const updatedExhibit = await prisma.exhibit.update({
    where: { id: exhibitId },
    data: {
      name,
      zoneName,
      description,
      imageUrl,
    },
    select: {
      id: true,
      name: true,
      zoneName: true,
      description: true,
      imageUrl: true,
      qrCodeIdentifier: true,
      isActive: true,
      createdAt: true,
    },
  });

  return updatedExhibit;
};

/**
 * Get detail of a single exhibit including stats, media, and learning content
 * @param {number} exhibitId - Exhibit ID
 */
export const getExhibitDetail = async (exhibitId) => {
  const exhibit = await prisma.exhibit.findUnique({
    where: { id: exhibitId },
    include: {
      learningContent: true,
      media: true,
    },
  });

  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
  }

  // 1. Calculate stats: total visitors
  const totalVisitors = await prisma.interaction.count({
    where: { exhibitId },
  });

  // 2. Calculate stats: average duration in minutes
  const durationAgg = await prisma.interaction.aggregate({
    _avg: { durationSeconds: true },
    where: { exhibitId, durationSeconds: { not: null } },
  });
  const avgDurationMinutes = Math.round((durationAgg._avg.durationSeconds || 0) / 60);

  // 3. Calculate stats: favorite media
  const interactions = await prisma.interaction.findMany({
    where: { exhibitId },
    select: {
      clickedAudio: true,
      clickedVideo: true,
      clickedVisual: true,
      clickedInteractive: true,
    },
  });

  const mediaCounts = {
    Audio: 0,
    Video: 0,
    Infografis: 0,
    Interactive: 0,
  };

  interactions.forEach((i) => {
    if (i.clickedAudio) mediaCounts.Audio++;
    if (i.clickedVideo) mediaCounts.Video++;
    if (i.clickedVisual) mediaCounts.Infografis++;
    if (i.clickedInteractive) mediaCounts.Interactive++;
  });

  let favoriteMedia = 'Infografis';
  let maxCount = 0;
  for (const [key, val] of Object.entries(mediaCounts)) {
    if (val > maxCount) {
      maxCount = val;
      favoriteMedia = key;
    }
  }

  // 4. Calculate stats: knowledge gain percentage
  const sessionsWithExhibit = await prisma.interaction.findMany({
    where: { exhibitId },
    select: { sessionId: true },
    distinct: ['sessionId'],
  });

  const sessionIds = sessionsWithExhibit.map((s) => s.sessionId);
  let knowledgeGainPercent = 35; // default fallback
  if (sessionIds.length > 0) {
    const eisAgg = await prisma.eisScore.aggregate({
      _avg: { knowledgeGainScore: true },
      where: { sessionId: { in: sessionIds } },
    });
    if (eisAgg._avg.knowledgeGainScore !== null) {
      knowledgeGainPercent = Math.round(eisAgg._avg.knowledgeGainScore);
    }
  }

  const contentStatus = {
    CHILD: {
      text: exhibit.learningContent.some((lc) => lc.ageCategory === 'CHILD' || lc.ageCategory === 'ALL'),
      media: exhibit.media.some((m) => m.ageCategory === 'CHILD' || m.ageCategory === 'ALL'),
    },
    TEEN: {
      text: exhibit.learningContent.some((lc) => lc.ageCategory === 'TEEN' || lc.ageCategory === 'ALL'),
      media: exhibit.media.some((m) => m.ageCategory === 'TEEN' || m.ageCategory === 'ALL'),
    },
    ADULT: {
      text: exhibit.learningContent.some((lc) => lc.ageCategory === 'ADULT' || lc.ageCategory === 'ALL'),
      media: exhibit.media.some((m) => m.ageCategory === 'ADULT' || m.ageCategory === 'ALL'),
    },
  };

  return {
    id: exhibit.id,
    name: exhibit.name,
    zone_name: exhibit.zoneName,
    description: exhibit.description,
    image_url: exhibit.imageUrl,
    qr_code_identifier: exhibit.qrCodeIdentifier,
    is_active: exhibit.isActive,
    created_at: exhibit.createdAt,
    content_status: contentStatus,
    media: exhibit.media.map((m) => ({
      id: m.id,
      exhibitId: m.exhibitId,
      ageCategory: m.ageCategory,
      mediaType: m.mediaType,
      title: m.title,
      fileUrl: m.fileUrl,
      created_at: m.createdAt,
    })),
    learningContent: exhibit.learningContent.map((lc) => ({
      id: lc.id,
      exhibitId: lc.exhibitId,
      ageCategory: lc.ageCategory,
      contentTitle: lc.contentTitle,
      contentBody: lc.contentBody,
      updatedAt: lc.updatedAt,
    })),
    stats: {
      totalVisitors,
      avgDurationMinutes,
      favoriteMedia,
      knowledgeGainPercent,
    },
  };
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

/**
 * Mengambil daftar kuis (admin)
 */
export const getQuizzes = async (filters = {}) => {
  try {
    const { quizType, ageCategory, scope } = filters;
    const where = {};
    if (quizType && quizType !== 'all') where.quizType = quizType;
    if (ageCategory && ageCategory !== 'all') where.ageCategory = ageCategory;
    if (scope && scope !== 'all') where.scope = scope;

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        exhibit: {
          select: { name: true }
        },
        questions: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      quizType: quiz.quizType,
      scope: quiz.scope,
      ageCategory: quiz.ageCategory,
      exhibitId: quiz.exhibitId,
      exhibitName: quiz.exhibit ? quiz.exhibit.name : 'Global',
      createdAt: quiz.createdAt,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        points: q.points,
      })),
    }));
  } catch (error) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat mengambil daftar kuis'
    );
  }
};

/**
 * Mengambil detail kuis berdasarkan ID (admin)
 */
export const getQuizDetail = async (quizId) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        exhibit: {
          select: { name: true }
        },
        questions: true,
      },
    });

    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan');
    }

    return {
      id: quiz.id,
      title: quiz.title,
      quizType: quiz.quizType,
      scope: quiz.scope,
      ageCategory: quiz.ageCategory,
      exhibitId: quiz.exhibitId,
      exhibitName: quiz.exhibit ? quiz.exhibit.name : 'Global',
      createdAt: quiz.createdAt,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        points: q.points,
      })),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat mengambil detail kuis'
    );
  }
};

/**
 * Hard delete learning content by ID
 * @param {number} id - Content ID
 */
export const deleteContent = async (id) => {
  const content = await prisma.learningPathContent.findUnique({
    where: { id: Number(id) },
  });

  if (!content) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Materi edukasi tidak ditemukan');
  }

  await prisma.learningPathContent.delete({
    where: { id: Number(id) },
  });

  return { message: 'Materi edukasi berhasil dihapus' };
};

/**
 * Hard delete exhibit media by ID
 * @param {number} id - Media ID
 */
export const deleteMedia = async (id) => {
  const media = await prisma.exhibitMedia.findUnique({
    where: { id: Number(id) },
  });

  if (!media) {
    throw new AppError(404, 'MEDIA_NOT_FOUND', 'Media tidak ditemukan');
  }

  await prisma.exhibitMedia.delete({
    where: { id: Number(id) },
  });

  return { message: 'Media berhasil dihapus' };
};

/**
 * Update an existing quiz with its questions atomically
 * @param {number} quizId - The quiz ID to update
 * @param {Object} data - Updated quiz data
 * @param {number|null} [data.exhibitId] - Exhibit ID
 * @param {string} data.scope - Quiz scope ('GLOBAL', 'EXHIBIT')
 * @param {string} data.title - Quiz title
 * @param {string} data.quizType - Quiz type
 * @param {string} data.ageCategory - Age category
 * @param {Array} data.questions - Array of quiz questions
 */
export const updateQuiz = async (quizId, { exhibitId, scope, title, quizType, ageCategory, questions }) => {
  // 1. Pastikan quiz ada
  const quiz = await prisma.quiz.findUnique({
    where: { id: Number(quizId) },
  });

  if (!quiz) {
    throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan');
  }

  // 2. Validasi constraint scope
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
    // 3. Eksekusi transaksi atomik
    const result = await prisma.$transaction(async (tx) => {
      // 3.1 Perbarui record Quiz di tabel quizzes
      const updatedQuiz = await tx.quiz.update({
        where: { id: Number(quizId) },
        data: {
          exhibitId: scope === 'GLOBAL' ? null : exhibitId,
          scope,
          title,
          quizType,
          ageCategory,
        },
      });

      // 3.2 Hapus semua pertanyaan kuis lama
      await tx.question.deleteMany({
        where: { quizId: Number(quizId) },
      });

      // 3.3 Petakan soal-soal baru dan tambahkan ke tabel questions
      const questionsData = questions.map((q) => ({
        quizId: Number(quizId),
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
        quizId: updatedQuiz.id,
        totalQuestionsUpdated: count,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Terjadi kesalahan sistem saat memperbarui kuis'
    );
  }
};

/**
 * Hard delete a quiz and all its questions (cascade)
 * @param {number} quizId - Quiz ID
 */
export const deleteQuiz = async (quizId) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan');
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return { message: 'Kuis berhasil dihapus' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat menghapus kuis');
  }
};

/**
 * Activate an exhibit (set isActive = true)
 * @param {number|string} exhibitId - Exhibit ID
 */
export const activateExhibit = async (exhibitId) => {
  const id = Number(exhibitId);
  const exhibit = await prisma.exhibit.findUnique({
    where: { id },
  });

  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
  }

  if (exhibit.isActive) {
    throw new AppError(409, 'CONFLICT', 'Kandang sudah aktif');
  }

  const updatedExhibit = await prisma.exhibit.update({
    where: { id },
    data: { isActive: true },
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
 * Hard delete an exhibit and all its related records (cascade delete via DB foreign keys)
 * @param {number|string} exhibitId - Exhibit ID
 */
export const hardDeleteExhibit = async (exhibitId) => {
  const id = Number(exhibitId);
  const exhibit = await prisma.exhibit.findUnique({
    where: { id },
  });

  if (!exhibit) {
    throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
  }

  await prisma.exhibit.delete({
    where: { id },
  });

  return { message: 'Kandang berhasil dihapus secara permanen' };
};


