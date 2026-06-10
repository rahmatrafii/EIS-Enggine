import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { generateRetentionToken, verifyRetentionToken } from '../utils/tokenUrl.js';
import { sendEmail } from '../utils/emailSender.js';
import { recalculateEis } from './eis.service.js';

const LIMIT_BY_CATEGORY = {
  CHILD: 5,
  TEEN: 10,
  ADULT: 10,
};

const getNumericSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const seededRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const shuffleWithSeed = (array, seed) => {
  const generator = seededRandom(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(generator() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};


/**
 * Memicu pengiriman email kuis retensi yang jatuh tempo.
 * @returns {Promise<{ processedCount: number, successCount: number, failCount: number }>}
 */
export const triggerRetention = async () => {
  try {
    // 1. Ambil antrean retensi yang masih PENDING dan scheduledAt <= NOW()
    const pendingSchedules = await prisma.retentionSchedule.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`[RETENTION TRIGGER] Menemukan ${pendingSchedules.length} antrean email retensi.`);

    let successCount = 0;
    let failCount = 0;

    // 2. Loop setiap antrean secara terisolasi dengan try/catch di dalam loop
    for (const schedule of pendingSchedules) {
      try {
        const { user, sessionId, quizType } = schedule;

        if (!user || !user.email) {
          throw new Error(`Data user atau email tidak ditemukan untuk schedule ID: ${schedule.id}`);
        }

        // 3. Generate token retensi khusus (expiry 24h)
        const token = generateRetentionToken(user.id, sessionId, quizType);

        // 4. Bangun URL Aplikasi (Mengarahkan ke halaman frontend /retention/[token])
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const quizUrl = `${baseUrl}/retention/${token}`;

        // 5. Tentukan periode retensi berdasarkan quizType
        const retentionPeriod = quizType === 'RETENTION_1W' ? 'H+7' : 'H+30';
        const retentionLabel = quizType === 'RETENTION_1W' ? 'H+7 (1 Minggu)' : 'H+30 (1 Bulan)';

        // 6. Template HTML Email Sederhana & Kirim
        const emailHtml = `
          <h2>Waktunya Mengingat Petualangan Anda!</h2>
          <p>Halo ${user.name}, mari uji seberapa banyak Anda mengingat hal menarik tentang fauna kebun binatang.</p>
          <p>Ini adalah <strong>Kuis Retensi ${retentionLabel}</strong> setelah kunjungan terakhir Anda.</p>
          <div style="margin: 20px 0;">
            <a href="${quizUrl}" style="padding:10px 15px; background:blue; color:white; text-decoration:none; border-radius:4px;">Mulai Kuis Retensi</a>
          </div>
          <p style="color: #666; font-size: 12px;">Kuis ini hanya berlaku selama 24 Jam.</p>
        `;

        await sendEmail({
          to: user.email,
          subject: `Zoo Companion - Kuis Retensi ${retentionPeriod} Anda Menunggu!`,
          html: emailHtml,
        });

        // 6. Update database ke status SENT dan isi sentAt
        await prisma.retentionSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        console.log(`[RETENTION SUCCESS] Berhasil mengirim email retensi ke: ${user.email} (Schedule ID: ${schedule.id})`);
        successCount++;
      } catch (error) {
        console.error(`[RETENTION ERROR] Gagal memproses schedule ID ${schedule.id}: ${error.message}`);
        failCount++;
      }
    }

    console.log(`[RETENTION SUMMARY] Selesai memproses. Sukses: ${successCount}, Gagal: ${failCount}`);

    return {
      processedCount: pendingSchedules.length,
      successCount,
      failCount,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', `Terjadi kesalahan sistem saat memicu retensi: ${error.message}`);
  }
};

/**
 * Mengambil kuis retensi berdasarkan token.
 * @param {string} token - Token retensi dari params
 * @returns {Promise<object>} Kuis retensi beserta daftar pertanyaannya (tanpa correctOption)
 */
export const getRetentionQuiz = async (token) => {
  try {
    // 1. Decode & verifikasi token menggunakan verifyRetentionToken
    const payload = verifyRetentionToken(token);
    if (!payload) {
      throw new AppError(400, 'RETENTION_EXPIRED', 'Token retensi tidak valid atau sudah kadaluarsa');
    }

    const { userId, sessionId, quizType } = payload;

    // 2. Cek status di retention_schedules: jika bukan SENT throw AppError 400 RETENTION_EXPIRED
    const schedule = await prisma.retentionSchedule.findFirst({
      where: {
        userId,
        sessionId,
        quizType,
      },
    });

    if (!schedule || schedule.status !== 'SENT') {
      throw new AppError(400, 'RETENTION_EXPIRED', 'Token retensi tidak valid atau sudah kadaluarsa');
    }

    // 3. Ambil data user untuk mendapatkan ageCategory
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ageCategory: true },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
    }

    // 4. Ambil soal kuis yang sesuai dari tabel quizzes berdasarkan quizType dan ageCategory user
    const quiz = await prisma.quiz.findFirst({
      where: {
        quizType,
        ageCategory: user.ageCategory,
        scope: 'GLOBAL',
      },
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
            points: true,
            // correctOption TIDAK BOLEH dikirim ke client
          },
        },
      },
    });

    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis retensi tidak ditemukan untuk kategori Anda');
    }

    // Shuffle and slice questions deterministically
    const limit = LIMIT_BY_CATEGORY[user.ageCategory] || 10;
    const sortedQuestions = [...quiz.questions].sort((a, b) => a.id - b.id);
    const seed = getNumericSeed(`${userId}-${sessionId}`);
    quiz.questions = shuffleWithSeed(sortedQuestions, seed).slice(0, limit);

    return quiz;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', `Terjadi kesalahan sistem saat mengambil kuis retensi: ${error.message}`);
  }
};

/**
 * Mensubmit jawaban kuis retensi berdasarkan token.
 * @param {string} token - Token retensi dari params
 * @param {Array} answersPayload - array object { questionId, chosenOption }
 * @returns {Promise<object>} Object UserQuizAttempt yang dibuat
 */
export const submitRetentionQuiz = async (token, answersPayload) => {
  try {
    // 1. Decode & verifikasi token menggunakan verifyRetentionToken
    const payload = verifyRetentionToken(token);
    if (!payload) {
      throw new AppError(400, 'RETENTION_EXPIRED', 'Token retensi tidak valid atau sudah kadaluarsa');
    }

    const { userId, sessionId, quizType } = payload;

    // 2. Cek status di retention_schedules
    const schedule = await prisma.retentionSchedule.findFirst({
      where: {
        userId,
        sessionId,
        quizType,
      },
    });

    if (!schedule) {
      throw new AppError(400, 'RETENTION_EXPIRED', 'Token retensi tidak valid atau sudah kadaluarsa');
    }

    if (schedule.status === 'COMPLETED') {
      throw new AppError(409, 'RETENTION_ALREADY_DONE', 'Kuis retensi sudah pernah dikerjakan');
    }

    if (schedule.status !== 'SENT') {
      throw new AppError(400, 'RETENTION_EXPIRED', 'Token retensi tidak valid atau sudah kadaluarsa');
    }

    // 3. Ambil data user untuk mendapatkan ageCategory
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ageCategory: true },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
    }

    // 4. Ambil soal kuis yang sesuai dari tabel quizzes berdasarkan quizType dan ageCategory user
    // scope: 'GLOBAL'
    const quiz = await prisma.quiz.findFirst({
      where: {
        quizType,
        ageCategory: user.ageCategory,
        scope: 'GLOBAL',
      },
      include: {
        questions: {
          select: {
            id: true,
            correctOption: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new AppError(404, 'QUIZ_NOT_FOUND', 'Kuis retensi tidak ditemukan untuk kategori Anda');
    }

    // Shuffle and slice questions deterministically (must match getRetentionQuiz exactly)
    const limit = LIMIT_BY_CATEGORY[user.ageCategory] || 10;
    const sortedQuestions = [...quiz.questions].sort((a, b) => a.id - b.id);
    const seed = getNumericSeed(`${userId}-${sessionId}`);
    const selectedQuestions = shuffleWithSeed(sortedQuestions, seed).slice(0, limit);

    const totalQuestions = selectedQuestions.length;
    if (totalQuestions === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Kuis tidak memiliki pertanyaan');
    }

    // 5. Lakukan logika koreksi array answersPayload yang dikirim user
    let correctCount = 0;
    const returnedAnswers = answersPayload.map(userAns => {
      const dbQuestion = selectedQuestions.find(q => q.id === userAns.questionId);
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

    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    // 6. Operasi multi-langkah transaksi
    const attemptResult = await prisma.$transaction(async (tx) => {
      // 1. Rekam jejak upaya (Attempt)
      const attempt = await tx.userQuizAttempt.create({
        data: {
          userId,
          sessionId,
          quizId: quiz.id,
          totalQuestions,
          correctAnswers: correctCount,
          finalScore,
          completedAt: new Date()
        }
      });

      // 2. Rekam massal detail soal
      const detailedAnswersData = returnedAnswers.map(ans => ({
        questionId: ans.questionId,
        chosenOption: ans.chosenOption,
        isCorrect: ans.isCorrect,
        attemptId: attempt.id
      }));
      await tx.userQuizAnswer.createMany({ data: detailedAnswersData });

      // 3. Update retention_schedules set status = COMPLETED setelah jawaban disimpan
      await tx.retentionSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'COMPLETED'
        }
      });

      return attempt;
    });

    // 7. Trigger recalculateEis(userId, sessionId) setelah semua tersimpan (fire-and-forget)
    recalculateEis(userId, sessionId).catch(console.error);

    return {
      attempt: attemptResult,
      answers: returnedAnswers
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', `Terjadi kesalahan sistem saat mensubmit kuis retensi: ${error.message}`);
  }
};


