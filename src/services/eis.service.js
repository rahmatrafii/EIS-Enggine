import prisma from '../config/prisma.js';
import {
  calculateKnowledgeGain,
  calculateEngagementScore,
  calculateRetentionScore,
  calculateFinalEis,
} from '../utils/eisCalculator.js';

export const recalculateEis = async (userId, sessionId) => {
  try {
    // Langkah 1 — Ambil Skor Pre-Zoo dan Post-Zoo dan Retention dari userQuizAttempt
    const quizAttempts = await prisma.userQuizAttempt.findMany({
      where: { userId, sessionId },
      select: {
        finalScore: true,
        quiz: {
          select: {
            quizType: true,
          },
        },
      },
    });

    let preZooScore = 0;
    let postZooScore = 0;
    let retention1wScore = null;
    let retention1mScore = null;

    for (const attempt of quizAttempts) {
      const type = attempt.quiz?.quizType;
      if (type === 'PRE_ZOO') {
        preZooScore = attempt.finalScore;
      } else if (type === 'POST_ZOO') {
        postZooScore = attempt.finalScore;
      } else if (type === 'RETENTION_1W') {
        retention1wScore = attempt.finalScore;
      } else if (type === 'RETENTION_1M') {
        retention1mScore = attempt.finalScore;
      }
    }

    // Langkah 2 — Hitung Knowledge Gain
    const knowledgeGainScore = calculateKnowledgeGain(preZooScore, postZooScore);

    // Langkah 3 — Ambil Data Interaksi untuk Engagement
    const interactions = await prisma.interaction.findMany({
      where: { sessionId, userId },
      select: {
        durationSeconds: true,
        clickedAudio: true,
        clickedVideo: true,
        clickedVisual: true,
        clickedInteractive: true,
        labLogs: {
          select: {
            id: true,
          },
        },
      },
    });

    const totalDurationSeconds = interactions.reduce(
      (sum, i) => sum + (i.durationSeconds || 0), 0
    );
    const totalExhibitsVisited = interactions.length;

    // Hitung media unik yang pernah diklik di SELURUH sesi
    const mediaTypes = new Set();
    for (const i of interactions) {
      if (i.clickedAudio) mediaTypes.add('AUDIO');
      if (i.clickedVideo) mediaTypes.add('VIDEO');
      if (i.clickedVisual) mediaTypes.add('IMAGE_INFOGRAPHIC');
      if (i.clickedInteractive) mediaTypes.add('INTERACTIVE_LAB');
    }
    const mediaClicked = mediaTypes.size;

    // Cek apakah pernah ada aktivitas lab interaktif
    const hasLabActivity = interactions.some(i => i.labLogs && i.labLogs.length > 0);

    // Langkah 4 — Hitung Engagement Score
    const engagementScore = calculateEngagementScore(
      totalDurationSeconds, totalExhibitsVisited, mediaClicked, hasLabActivity
    );

    // Langkah 5 — Ambil dan Hitung Retention Score
    const retentionScore = calculateRetentionScore(retention1wScore, retention1mScore);

    // Langkah 6 — Hitung Final EIS Score
    const finalEisScore = calculateFinalEis(knowledgeGainScore, engagementScore, retentionScore);

    // Langkah 7 — Tentukan Favorite Media & Upsert ke Database
    // Hitung frekuensi per tipe media di seluruh interaction
    const mediaCounts = { AUDIO: 0, VIDEO: 0, IMAGE_INFOGRAPHIC: 0, INTERACTIVE_LAB: 0 };
    for (const i of interactions) {
      if (i.clickedAudio) mediaCounts.AUDIO++;
      if (i.clickedVideo) mediaCounts.VIDEO++;
      if (i.clickedVisual) mediaCounts.IMAGE_INFOGRAPHIC++;
      if (i.clickedInteractive) mediaCounts.INTERACTIVE_LAB++;
    }

    let favoriteMedia = null;
    let maxCount = 0;
    for (const [media, count] of Object.entries(mediaCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteMedia = media;
      }
    }

    // Upsert ke database
    await prisma.eisScore.upsert({
      where: { userId },
      create: {
        userId,
        sessionId,
        preZooScore,
        postZooScore,
        knowledgeGainScore,
        totalDurationSeconds,
        totalExhibitsVisited,
        favoriteMedia,
        engagementScore,
        retention1wScore,
        retention1mScore,
        retentionScore,
        finalEisScore,
        calculatedAt: new Date(),
      },
      update: {
        sessionId,
        preZooScore,
        postZooScore,
        knowledgeGainScore,
        totalDurationSeconds,
        totalExhibitsVisited,
        favoriteMedia,
        engagementScore,
        retention1wScore,
        retention1mScore,
        retentionScore,
        finalEisScore,
        calculatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error(`[EIS_RECALCULATION_ERROR] Failed to recalculate EIS for userId: ${userId}, sessionId: ${sessionId}:`, error);
  }
};

