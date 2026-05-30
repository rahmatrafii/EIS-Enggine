import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { recalculateEis } from './eis.service.js';

/**
 * Mengambil satu kuis yang sesuai dengan kriteria sesi, tipe, dan usia pengguna.
 * Field correctOption TIDAK disertakan dalam hasil kembalian sesuai aturan keamanan.
 *
 * @param {number} userId    - ID user dari JWT (req.user.userId)
 * @param {number} sessionId - ID sesi kunjungan aktif
 * @param {string} type      - QuizType enum: PRE_ZOO | POST_ZOO | RETENTION_1W | RETENTION_1M
 * @param {number|undefined} exhibitId - ID exhibit (opsional, untuk kuis ber-scope EXHIBIT)
 */
export const fetchQuiz = async (userId, sessionId, type, exhibitId) => {
  try {
    // 1. Verifikasi sesi: pastikan ada dan milik user yang sedang login
    const session = await prisma.visitSession.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        user: {
          select: { ageCategory: true }
        }
      }
    });

    if (!session || session.userId !== userId) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan atau bukan milik Anda');
    }

    // 2. Bangun filter pencarian kuis berdasarkan kriteria
    const whereClause = {
      quizType: type,
      ageCategory: session.user.ageCategory
    };

    // Jika exhibitId diberikan → kuis ber-scope EXHIBIT pada kandang tersebut
    // Jika tidak              → kuis ber-scope GLOBAL
    if (exhibitId !== undefined) {
      whereClause.exhibitId = exhibitId;
      whereClause.scope = 'EXHIBIT';
    } else {
      whereClause.scope = 'GLOBAL';
    }

    // 3. Ambil kuis beserta soal — correctOption SENGAJA tidak di-select
    const quiz = await prisma.quiz.findFirst({
      where: whereClause,
      select: {
        id: true,
        title: true,
        quizType: true,
        scope: true,
        ageCategory: true,
        exhibitId: true,
        questions: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            points: true
            // correctOption tidak di-select — DILARANG dikirim ke client
          }
        }
      }
    });

    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan untuk kriteria yang diberikan');
    }

    return quiz;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data kuis');
  }
};

/**
 * Mensubmit jawaban kuis.
 *
 * @param {number} userId - ID user dari JWT (req.user.userId)
 * @param {number} sessionId - ID sesi
 * @param {number} quizId - ID kuis
 * @param {Array} answersPayload - array object { questionId, chosenOption }
 */
export const submitQuiz = async (userId, sessionId, quizId, answersPayload) => {
  try {
    // Validasi sesi
    const session = await prisma.visitSession.findUnique({ 
      where: { id: sessionId },
      select: { userId: true }
    });
    if (!session || session.userId !== userId) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak valid atau tidak ditemukan');
    }

    // Cek apakah pernah submit kuis yang sama di sesi ini
    const existingAttempt = await prisma.userQuizAttempt.findFirst({
      where: { sessionId, quizId },
      select: { id: true }
    });
    if (existingAttempt) {
      throw new AppError(409, 'QUIZ_ALREADY_SUBMITTED', 'Anda sudah mengambil kuis ini');
    }

    // Cek validasi Quiz Questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        quizType: true,
        questions: {
          select: {
            id: true,
            correctOption: true
          }
        }
      }
    });
    
    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis tidak ditemukan');
    }

    // Lakukan logika koreksi array answersPayload yang dikirim user
    let correctCount = 0;
    const answerEntries = answersPayload.map(userAns => {
      const dbQuestion = quiz.questions.find(q => q.id === userAns.questionId);
      const isCorrect = dbQuestion && (dbQuestion.correctOption === userAns.chosenOption);
      
      if (isCorrect) {
        correctCount++;
      }
      
      return {
        questionId: userAns.questionId,
        chosenOption: userAns.chosenOption,
        isCorrect: !!isCorrect
      };
    });

    const totalQuestions = quiz.questions.length;
    const finalScore = Math.round((correctCount / totalQuestions) * 100);

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
       // run-and-forget background operation
       recalculateEis(userId, sessionId).catch(console.error);
    }

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mensubmit kuis');
  }
};

/**
 * Mengambil hasil perbandingan (knowledge gain) kuis PRE_ZOO dan POST_ZOO dalam sebuah sesi.
 * 
 * @param {number} userId - ID user dari JWT
 * @param {number} sessionId - ID sesi
 */
export const getQuizResult = async (userId, sessionId) => {
  try {
    const session = await prisma.visitSession.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Akses ditolak: Sesi bukan milik Anda');
    }

    const attempts = await prisma.userQuizAttempt.findMany({
      where: { sessionId },
      select: {
        finalScore: true,
        quiz: {
          select: { quizType: true }
        }
      }
    });

    let preZooScore = 0;
    let postZooScore = 0;

    for (const attempt of attempts) {
      if (attempt.quiz.quizType === 'PRE_ZOO') {
        preZooScore = attempt.finalScore;
      } else if (attempt.quiz.quizType === 'POST_ZOO') {
        postZooScore = attempt.finalScore;
      }
    }

    let knowledgeGain = postZooScore - preZooScore;
    if (knowledgeGain < 0) {
      knowledgeGain = 0;
    }

    return {
      preZooScore,
      postZooScore,
      knowledgeGain
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil hasil kuis');
  }
};

/**
 * Mengambil status jadwal retensi kuis untuk user tertentu.
 * 
 * @param {number} userId - ID user dari JWT
 */
export const getRetentionStatus = async (userId) => {
  try {
    const schedules = await prisma.retentionSchedule.findMany({
      where: { userId },
      select: {
        id: true,
        sessionId: true,
        quizType: true,
        scheduledAt: true,
        sentAt: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    return schedules;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil status retensi');
  }
};
