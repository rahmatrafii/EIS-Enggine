import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { recalculateEis } from './eis.service.js';
import { generateRetentionToken } from '../utils/tokenUrl.js';

/**
 * Helper to shuffle an array using Fisher-Yates algorithm.
 * @param {Array} array 
 * @returns {Array} Shuffled array
 */
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

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

    // Mengacak dan membatasi soal berdasarkan kategori usia (Anak: 5, Remaja: 8, Dewasa: 10)
    if (quiz.questions && quiz.questions.length > 0) {
      let limit = 10;
      if (quiz.quizType === 'PRE_ZOO' || quiz.quizType === 'POST_ZOO') {
        const ageCategory = session.user.ageCategory;
        if (ageCategory === 'CHILD') limit = 5;
        else if (ageCategory === 'TEEN') limit = 8;
        else if (ageCategory === 'ADULT') limit = 10;
      }
      quiz.questions = shuffleArray(quiz.questions).slice(0, limit);
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
        isCorrect: !!isCorrect,
        correctOption: dbQuestion ? dbQuestion.correctOption : null
      };
    });

    const totalQuestions = answersPayload.length;
    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    // Operasi multi-langkah transaksi 
    const result = await prisma.$transaction(async (tx) => {
      // 1. Rekam jejak upaya (Attempt)
      const attempt = await tx.userQuizAttempt.create({
        data: {
          userId,
          sessionId,
          quizId,
          totalQuestions,
          correctAnswers: correctCount,
          finalScore,
          completedAt: new Date()
        }
      });

      // 2. Rekam massal detail soal
      const detailedAnswersData = answerEntries.map(ans => ({
        questionId: ans.questionId,
        chosenOption: ans.chosenOption,
        isCorrect: ans.isCorrect,
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

    return {
      ...result,
      answers: answerEntries
    };
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
    let hasPreZoo = false;
    let hasPostZoo = false;

    for (const attempt of attempts) {
      if (attempt.quiz.quizType === 'PRE_ZOO') {
        preZooScore = attempt.finalScore;
        hasPreZoo = true;
      } else if (attempt.quiz.quizType === 'POST_ZOO') {
        postZooScore = attempt.finalScore;
        hasPostZoo = true;
      }
    }

    let knowledgeGain = postZooScore - preZooScore;
    if (knowledgeGain < 0) {
      knowledgeGain = 0;
    }

    return {
      preZooScore,
      postZooScore,
      knowledgeGain,
      hasPreZoo,
      hasPostZoo
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

    const result = [];
    for (const schedule of schedules) {
      let score = null;
      let token = null;
      let completedAt = null;

      if (schedule.status === 'COMPLETED') {
        const attempt = await prisma.userQuizAttempt.findFirst({
          where: {
            userId: schedule.userId,
            sessionId: schedule.sessionId,
            quiz: {
              quizType: schedule.quizType
            }
          },
          select: {
            finalScore: true,
            completedAt: true
          }
        });
        if (attempt) {
          score = attempt.finalScore;
          completedAt = attempt.completedAt;
        }
      }

      if (schedule.status === 'SENT') {
        const isExpired = schedule.sentAt && (new Date() - new Date(schedule.sentAt) > 24 * 60 * 60 * 1000);
        if (isExpired) {
          await prisma.retentionSchedule.update({
            where: { id: schedule.id },
            data: { status: 'EXPIRED' }
          });
          schedule.status = 'EXPIRED';
        } else {
          token = generateRetentionToken(userId, schedule.sessionId, schedule.quizType);
        }
      }

      result.push({
        ...schedule,
        score,
        token,
        completedAt
      });
    }

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil status retensi');
  }
};
