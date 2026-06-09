import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';
import { assignGrade } from '../utils/eisCalculator.js';

export const getEisScore = async (requestingUserId, requestingUserRole, targetUserId) => {
  try {
    // 1. Ownership check: hanya user sendiri atau ADMIN yang boleh akses
    if (requestingUserRole !== 'ADMIN' && requestingUserId !== targetUserId) {
      throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses untuk melihat skor EIS user lain');
    }

    // 2. Ambil data user beserta detailnya
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        visitSessions: {
          include: {
            interactions: {
              include: {
                exhibit: true
              }
            },
            quizAttempts: {
              include: {
                quiz: true
              }
            },
            retentionSchedules: true
          },
          orderBy: {
            visitDate: 'desc'
          }
        }
      }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
    }

    // 3. Ambil data eis_scores berdasarkan userId
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

    // 4. Jika belum ada record, kembalikan data default semua score = 0
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

    // 5. Hitung grade & badge dari finalEisScore
    const { grade, badge } = assignGrade(data.finalEisScore);

    // 6. Return response lengkap
    return {
      userId: data.userId,
      sessionId: data.sessionId,
      preZooScore: data.preZooScore,
      postZooScore: data.postZooScore,
      knowledgeGainScore: data.knowledgeGainScore,
      totalDurationSeconds: data.totalDurationSeconds,
      totalExhibitsVisited: data.totalExhibitsVisited,
      engagementScore: data.engagementScore,
      retention1wScore: data.retention1wScore,
      retention1mScore: data.retention1mScore,
      retentionScore: data.retentionScore,
      finalEisScore: data.finalEisScore,
      calculatedAt: data.calculatedAt,
      updatedAt: data.updatedAt,
      grade,
      badge,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        ageCategory: user.ageCategory,
        registeredAt: user.registeredAt,
        visitSessions: user.visitSessions
      }
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

    const activeSessionsThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const active_sessions = await prisma.visitSession.count({
      where: {
        isCompleted: false,
        checkOutAt: null,
        checkInAt: {
          gte: activeSessionsThreshold
        }
      }
    });

    const activeSessionsUsers = await prisma.visitSession.findMany({
      where: {
        isCompleted: false,
        checkOutAt: null,
        checkInAt: {
          gte: activeSessionsThreshold
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 3,
      orderBy: {
        checkInAt: 'desc'
      }
    });

    const active_users = activeSessionsUsers.map(s => ({
      id: s.user.id,
      name: s.user.name
    }));

    const summary = {
      total_visitors,
      avg_eis_score,
      avg_duration_minutes,
      active_sessions,
      active_users
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

    const top_exhibits = await Promise.all(
      topExhibitsAgg.map(async (item) => {
        const exhibit = exhibits.find(e => e.id === item.exhibitId);

        // 1. Calculate total visits
        const totalVisits = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId
          }
        });

        // 2. Calculate age breakdown
        const anakCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            user: {
              ...interactionWhere.user,
              ageCategory: 'CHILD'
            }
          }
        });
        const remajaCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            user: {
              ...interactionWhere.user,
              ageCategory: 'TEEN'
            }
          }
        });
        const dewasaCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            user: {
              ...interactionWhere.user,
              ageCategory: 'ADULT'
            }
          }
        });

        const totalAge = anakCount + remajaCount + dewasaCount;
        const anak = totalAge > 0 ? Math.round((anakCount / totalAge) * 100) : 0;
        const remaja = totalAge > 0 ? Math.round((remajaCount / totalAge) * 100) : 0;
        const dewasa = totalAge > 0 ? Math.max(0, 100 - anak - remaja) : 0;

        // 3. Calculate media breakdown
        const audioCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            clickedAudio: true
          }
        });
        const videoCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            clickedVideo: true
          }
        });
        const infographicCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            clickedVisual: true
          }
        });
        const interactiveCount = await prisma.interaction.count({
          where: {
            ...interactionWhere,
            exhibitId: item.exhibitId,
            clickedInteractive: true
          }
        });

        const audio = totalVisits > 0 ? Math.round((audioCount / totalVisits) * 100) : 0;
        const video = totalVisits > 0 ? Math.round((videoCount / totalVisits) * 100) : 0;
        const infographic = totalVisits > 0 ? Math.round((infographicCount / totalVisits) * 100) : 0;
        const interactive = totalVisits > 0 ? Math.round((interactiveCount / totalVisits) * 100) : 0;

        return {
          exhibit_id: item.exhibitId,
          exhibit_name: exhibit ? exhibit.name : 'Unknown',
          avg_duration: Number((item._avg.durationSeconds || 0).toFixed(2)),
          total_visits: totalVisits,
          age_breakdown: { anak, remaja, dewasa },
          media_breakdown: { audio, video, infographic, interactive }
        };
      })
    );

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
    const getAgeCategoryData = async (category) => {
      const where = {
        ...eisWhere,
        user: {
          ...eisWhere.user,
          ageCategory: category
        }
      };
      const agg = await prisma.eisScore.aggregate({
        _avg: {
          finalEisScore: true,
          knowledgeGainScore: true
        },
        where
      });

      // Find the most frequent favoriteMedia for this age category
      const mediaFavAgg = await prisma.eisScore.groupBy({
        by: ['favoriteMedia'],
        _count: {
          favoriteMedia: true
        },
        where: {
          ...where,
          favoriteMedia: { not: null }
        },
        orderBy: {
          _count: {
            favoriteMedia: 'desc'
          }
        },
        take: 1
      });

      const favorite_media = mediaFavAgg.length > 0 ? mediaFavAgg[0].favoriteMedia : null;

      return {
        age_category: category,
        avg_eis_score: Number((agg._avg.finalEisScore || 0).toFixed(2)),
        avg_knowledge_gain: Number((agg._avg.knowledgeGainScore || 0).toFixed(2)),
        favorite_media
      };
    };

    const age_category_performance = [
      await getAgeCategoryData('CHILD'),
      await getAgeCategoryData('TEEN'),
      await getAgeCategoryData('ADULT')
    ];

    // 6. Calculate weekly visitor & EIS score trend (last 7 days)
    const trendToday = new Date();
    const startDate = new Date(trendToday);
    startDate.setDate(trendToday.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(trendToday);
    endDate.setHours(23, 59, 59, 999);

    const trendSessions = await prisma.visitSession.findMany({
      where: {
        visitDate: {
          gte: startDate,
          lte: endDate
        },
        user: {
          role: 'VISITOR',
          ...(age_category && { ageCategory: age_category })
        }
      },
      select: {
        visitDate: true
      }
    });

    const trendEisScores = await prisma.eisScore.findMany({
      where: {
        session: {
          visitDate: {
            gte: startDate,
            lte: endDate
          }
        },
        user: {
          role: 'VISITOR',
          ...(age_category && { ageCategory: age_category })
        }
      },
      select: {
        finalEisScore: true,
        session: {
          select: {
            visitDate: true
          }
        }
      }
    });

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(trendToday);
      d.setDate(trendToday.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Mon"
      const dateStr = d.toDateString();

      const daySessions = trendSessions.filter(s => new Date(s.visitDate).toDateString() === dateStr);
      const visitorsCount = daySessions.length;

      const dayScores = trendEisScores.filter(s => s.session && new Date(s.session.visitDate).toDateString() === dateStr);
      const avgEis = dayScores.length > 0
        ? Math.round(dayScores.reduce((sum, s) => sum + s.finalEisScore, 0) / dayScores.length)
        : 0;

      trend.push({
        name: dayName,
        visitors: visitorsCount,
        eis: avgEis
      });
    }

    return {
      summary,
      top_exhibits,
      media_effectiveness,
      age_category_performance,
      trend
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data dashboard analitik');
  }
};

export const getVisitorList = async ({ date_from, date_to, age_category }) => {
  try {
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

    const visitors = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        ageCategory: true,
        eisScore: {
          select: {
            finalEisScore: true
          }
        },
        visitSessions: {
          where: {
            ...( (date_from || date_to) && {
              visitDate: {
                ...(date_from && { gte: new Date(date_from) }),
                ...(date_to && { lte: new Date(date_to) })
              }
            })
          },
          select: {
            id: true,
            visitDate: true
          },
          orderBy: {
            visitDate: 'desc'
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    return visitors.map(v => {
      const eisScoreVal = v.eisScore ? v.eisScore.finalEisScore : 0;
      const { grade } = assignGrade(eisScoreVal);

      // Find the last visit date
      let lastVisitDate = null;
      if (v.visitSessions.length > 0) {
        lastVisitDate = v.visitSessions[0].visitDate;
      }

      return {
        id: v.id,
        name: v.name,
        email: v.email,
        category: v.ageCategory,
        lastVisit: lastVisitDate,
        visits: v.visitSessions.length,
        eisScore: eisScoreVal,
        grade
      };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil daftar pengunjung');
  }
};

export const getExhibitTrend = async (exhibitId) => {
  try {
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: exhibitId }
    });
    if (!exhibit) {
      throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan');
    }

    const trendToday = new Date();
    const startDate = new Date(trendToday);
    startDate.setDate(trendToday.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(trendToday);
    endDate.setHours(23, 59, 59, 999);

    const interactions = await prisma.interaction.findMany({
      where: {
        exhibitId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true,
        sessionId: true
      }
    });

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(trendToday);
      d.setDate(trendToday.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toDateString();

      const dayInteractions = interactions.filter(
        item => new Date(item.createdAt).toDateString() === dateStr
      );

      const visitorsCount = new Set(dayInteractions.map(item => item.sessionId)).size;
      const interactionsCount = dayInteractions.length;

      trend.push({
        name: dayName,
        visitors: visitorsCount,
        interactions: interactionsCount
      });
    }

    return trend;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil data tren kandang');
  }
};



