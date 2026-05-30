import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { assignGrade } from '../utils/eisCalculator.js';

export const getEisScore = async (requestingUserId, requestingUserRole, targetUserId) => {
  try {
    // 1. Ownership check: hanya user sendiri atau ADMIN yang boleh akses
    if (requestingUserRole !== 'ADMIN' && requestingUserId !== targetUserId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses untuk melihat skor EIS user lain');
    }

    // 2. Ambil data eis_scores berdasarkan userId
    const eisScore = await prisma.eisScore.findUnique({
      where: { userId: targetUserId },
      select: {
        userId: true,
        sessionId: true,
        preZooScore: true,
        postZooScore: true,
        knowledgeGainScore: true,
        totalDurationSeconds: true,
        totalExhibitsVisited: true,
        engagementScore: true,
        retention1wScore: true,
        retention1mScore: true,
        retentionScore: true,
        finalEisScore: true,
        calculatedAt: true,
        updatedAt: true
      }
    });

    // 3. Jika belum ada record, kembalikan data default semua score = 0
    const data = eisScore || {
      userId: targetUserId,
      sessionId: null,
      preZooScore: 0,
      postZooScore: 0,
      knowledgeGainScore: 0,
      totalDurationSeconds: 0,
      totalExhibitsVisited: 0,
      engagementScore: 0,
      retention1wScore: null,
      retention1mScore: null,
      retentionScore: 0,
      finalEisScore: 0,
      calculatedAt: null,
      updatedAt: null
    };

    // 4. Hitung grade & badge dari finalEisScore
    const { grade, badge } = assignGrade(data.finalEisScore);

    // 5. Return response lengkap
    return {
      ...data,
      grade,
      badge
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data skor EIS');
  }
};

export const getSessionAnalytics = async (userId, sessionId) => {
  try {
    const session = await prisma.visitSession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: {
          include: {
            exhibit: true,
            labLogs: true
          }
        },
        quizAttempts: {
          include: {
            quiz: true
          }
        }
      }
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi kunjungan tidak ditemukan');
    }

    // Ownership check: pastikan sesi milik user yang sedang login
    if (session.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses untuk melihat analitik sesi ini');
    }

    // Hitung total durasi dari semua interactions di sesi tersebut
    const totalDuration = session.interactions.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);

    // Tentukan favorite_media berdasarkan media yang paling sering diklik di semua interactions
    const mediaCounts = {
      AUDIO: 0,
      VIDEO: 0,
      IMAGE_INFOGRAPHIC: 0,
      INTERACTIVE_LAB: 0
    };

    session.interactions.forEach(i => {
      if (i.clickedAudio) mediaCounts.AUDIO++;
      if (i.clickedVideo) mediaCounts.VIDEO++;
      if (i.clickedVisual) mediaCounts.IMAGE_INFOGRAPHIC++;
      if (i.clickedInteractive) mediaCounts.INTERACTIVE_LAB++;
    });

    let favoriteMedia = null;
    let maxClicks = 0;
    for (const [media, count] of Object.entries(mediaCounts)) {
      if (count > maxClicks) {
        maxClicks = count;
        favoriteMedia = media;
      }
    }

    // Daftar kandang yang dikunjungi beserta durasi dan media
    const exhibits = session.interactions.map(i => ({
      interactionId: i.id,
      exhibitId: i.exhibitId,
      exhibitName: i.exhibit.name,
      zoneName: i.exhibit.zoneName,
      startTime: i.startTime,
      endTime: i.endTime,
      durationSeconds: i.durationSeconds,
      mediaClicked: {
        audio: i.clickedAudio,
        video: i.clickedVideo,
        visual: i.clickedVisual,
        interactive: i.clickedInteractive
      },
      labLogs: i.labLogs.map(log => ({
        id: log.id,
        gameName: log.gameName,
        actionTaken: log.actionTaken,
        scoreAchieved: log.scoreAchieved,
        loggedAt: log.loggedAt
      }))
    }));

    // Hasil pre dan post test
    const preTestAttempt = session.quizAttempts.find(a => a.quiz.quizType === 'PRE_ZOO');
    const postTestAttempt = session.quizAttempts.find(a => a.quiz.quizType === 'POST_ZOO');

    const quizResults = {
      preTest: preTestAttempt ? {
        attemptId: preTestAttempt.id,
        quizId: preTestAttempt.quizId,
        quizTitle: preTestAttempt.quiz.title,
        totalQuestions: preTestAttempt.totalQuestions,
        correctAnswers: preTestAttempt.correctAnswers,
        finalScore: preTestAttempt.finalScore,
        startedAt: preTestAttempt.startedAt,
        completedAt: preTestAttempt.completedAt
      } : null,
      postTest: postTestAttempt ? {
        attemptId: postTestAttempt.id,
        quizId: postTestAttempt.quizId,
        quizTitle: postTestAttempt.quiz.title,
        totalQuestions: postTestAttempt.totalQuestions,
        correctAnswers: postTestAttempt.correctAnswers,
        finalScore: postTestAttempt.finalScore,
        startedAt: postTestAttempt.startedAt,
        completedAt: postTestAttempt.completedAt
      } : null
    };

    return {
      sessionSummary: {
        sessionId: session.id,
        userId: session.userId,
        visitDate: session.visitDate,
        checkInAt: session.checkInAt,
        checkOutAt: session.checkOutAt,
        isCompleted: session.isCompleted,
        totalDurationSeconds: totalDuration,
        totalExhibitsVisited: session.interactions.length,
        favoriteMedia
      },
      exhibits,
      quizResults
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil analitik sesi');
  }
};

export const getDashboardAnalytics = async ({ date_from, date_to, age_category }) => {
  try {
    // 1. Setup base filters
    const userWhere = { role: 'VISITOR' };
    if (age_category) {
      userWhere.ageCategory = age_category;
    }
    if (date_from || date_to) {
      userWhere.visitSessions = {
        some: {
          visitDate: {
            ...(date_from && { gte: new Date(date_from) }),
            ...(date_to && { lte: new Date(date_to) })
          }
        }
      };
    }

    const eisWhere = {
      user: {
        role: 'VISITOR',
        ...(age_category && { ageCategory: age_category })
      },
      ...( (date_from || date_to) && {
        session: {
          visitDate: {
            ...(date_from && { gte: new Date(date_from) }),
            ...(date_to && { lte: new Date(date_to) })
          }
        }
      })
    };

    const interactionWhere = {
      user: {
        role: 'VISITOR',
        ...(age_category && { ageCategory: age_category })
      },
      ...( (date_from || date_to) && {
        session: {
          visitDate: {
            ...(date_from && { gte: new Date(date_from) }),
            ...(date_to && { lte: new Date(date_to) })
          }
        }
      })
    };

    // 2. Calculate summary
    // a. total_visitors
    const total_visitors = await prisma.user.count({ where: userWhere });

    // b. avg_eis_score & avg_duration_minutes
    const eisAgg = await prisma.eisScore.aggregate({
      _avg: {
        finalEisScore: true,
        totalDurationSeconds: true
      },
      where: eisWhere
    });

    const avg_eis_score = Number((eisAgg._avg.finalEisScore || 0).toFixed(2));
    const avg_duration_minutes = Number(((eisAgg._avg.totalDurationSeconds || 0) / 60).toFixed(2));

    const summary = {
      total_visitors,
      avg_eis_score,
      avg_duration_minutes
    };

    // 3. Calculate top_exhibits
    const topExhibitsAgg = await prisma.interaction.groupBy({
      by: ['exhibitId'],
      _avg: {
        durationSeconds: true
      },
      where: {
        ...interactionWhere,
        durationSeconds: { not: null }
      },
      orderBy: {
        _avg: {
          durationSeconds: 'desc'
        }
      },
      take: 5
    });

    const exhibitIds = topExhibitsAgg.map(item => item.exhibitId);
    const exhibits = await prisma.exhibit.findMany({
      where: { id: { in: exhibitIds } },
      select: { id: true, name: true }
    });

    const top_exhibits = topExhibitsAgg.map(item => {
      const exhibit = exhibits.find(e => e.id === item.exhibitId);
      return {
        exhibit_id: item.exhibitId,
        exhibit_name: exhibit ? exhibit.name : 'Unknown',
        avg_duration: Number((item._avg.durationSeconds || 0).toFixed(2))
      };
    });

    // 4. Calculate media_effectiveness
    const getMediaEffectiveness = async (mediaTypeField) => {
      const where = {
        ...eisWhere,
        session: {
          ...(eisWhere.session || {}),
          interactions: {
            some: {
              [mediaTypeField]: true
            }
          }
        }
      };
      const agg = await prisma.eisScore.aggregate({
        _avg: {
          knowledgeGainScore: true
        },
        where
      });
      return Number((agg._avg.knowledgeGainScore || 0).toFixed(2));
    };

    const media_effectiveness = [
      { media_type: 'AUDIO', avg_knowledge_gain: await getMediaEffectiveness('clickedAudio') },
      { media_type: 'VIDEO', avg_knowledge_gain: await getMediaEffectiveness('clickedVideo') },
      { media_type: 'IMAGE_INFOGRAPHIC', avg_knowledge_gain: await getMediaEffectiveness('clickedVisual') },
      { media_type: 'INTERACTIVE_LAB', avg_knowledge_gain: await getMediaEffectiveness('clickedInteractive') }
    ];

    // 5. Calculate age_category_performance
    const getAgeCategoryAvg = async (category) => {
      const where = {
        ...eisWhere,
        user: {
          ...eisWhere.user,
          ageCategory: category
        }
      };
      const agg = await prisma.eisScore.aggregate({
        _avg: {
          finalEisScore: true
        },
        where
      });
      return Number((agg._avg.finalEisScore || 0).toFixed(2));
    };

    const age_category_performance = [
      { age_category: 'CHILD', avg_eis_score: await getAgeCategoryAvg('CHILD') },
      { age_category: 'TEEN', avg_eis_score: await getAgeCategoryAvg('TEEN') },
      { age_category: 'ADULT', avg_eis_score: await getAgeCategoryAvg('ADULT') }
    ];

    return {
      summary,
      top_exhibits,
      media_effectiveness,
      age_category_performance
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data dashboard analitik');
  }
};


