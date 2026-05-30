/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// MOCK DI AWAL SEBELUM IMPORTS LAINNYA
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    eisScore: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    visitSession: {
      findUnique: jest.fn(),
    },
    interaction: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userQuizAttempt: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    exhibit: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/utils/eisCalculator.js', () => ({
  assignGrade: jest.fn().mockReturnValue({ grade: 'A', badge: 'Penjelajah Konservasi' }),
  calculateFinalEis: jest.fn().mockReturnValue(85),
  calculateKnowledgeGain: jest.fn().mockReturnValue(40),
  calculateEngagementScore: jest.fn().mockReturnValue(88),
  calculateRetentionScore: jest.fn().mockReturnValue(75),
}));

// DYNAMIC IMPORTS AGAR MOCK BEKERJA
const prisma = (await import('../src/config/prisma.js')).default;
const eisCalculator = await import('../src/utils/eisCalculator.js');
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

// Helper
const generateTestToken = (userId, role = 'VISITOR') =>
  jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);

// Data Fixture
const mockEisScore = {
  id: 1,
  userId: 1,
  sessionId: 1,
  preZooScore: 40,
  postZooScore: 80,
  knowledgeGainScore: 40,
  totalDurationSeconds: 5400,
  totalExhibitsVisited: 7,
  favoriteMedia: 'INTERACTIVE_LAB',
  engagementScore: 88,
  retention1wScore: 80,
  retention1mScore: 70,
  retentionScore: 75,
  finalEisScore: 85,
  calculatedAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  id: 1,
  userId: 1,
  visitDate: new Date('2026-05-15'),
  checkInAt: new Date('2026-05-15T08:30:00Z'),
  checkOutAt: new Date('2026-05-15T14:00:00Z'),
  isCompleted: true,
};

const mockInteractions = [
  {
    id: 1,
    sessionId: 1,
    exhibitId: 3,
    startTime: new Date('2026-05-15T09:00:00Z'),
    endTime: new Date('2026-05-15T09:15:00Z'),
    durationSeconds: 900,
    clickedAudio: true,
    clickedVideo: false,
    clickedVisual: false,
    clickedInteractive: true,
    exhibit: { name: 'Harimau Sumatera', zoneName: 'Zona Mamalia' },
    labLogs: [],
  },
  {
    id: 2,
    sessionId: 1,
    exhibitId: 4,
    startTime: new Date('2026-05-15T09:30:00Z'),
    endTime: new Date('2026-05-15T09:42:00Z'),
    durationSeconds: 720,
    clickedAudio: false,
    clickedVideo: true,
    clickedVisual: true,
    clickedInteractive: false,
    exhibit: { name: 'Gajah Sumatra', zoneName: 'Zona Mamalia' },
    labLogs: [],
  },
];

const mockQuizAttempts = [
  {
    id: 10,
    quizId: 1,
    totalQuestions: 10,
    correctAnswers: 4,
    finalScore: 40,
    startedAt: new Date(),
    completedAt: new Date(),
    quiz: { quizType: 'PRE_ZOO', title: 'Pre Zoo Quiz' },
  },
  {
    id: 11,
    quizId: 2,
    totalQuestions: 10,
    correctAnswers: 8,
    finalScore: 80,
    startedAt: new Date(),
    completedAt: new Date(),
    quiz: { quizType: 'POST_ZOO', title: 'Post Zoo Quiz' },
  },
];

const mockDashboardData = {
  totalVisitors: 1250,
  avgEisScore: 72,
  avgDurationMinutes: 180,
};

// ─── GET /api/v1/analytics/eis/:user_id ──────────────────────────────────────
describe('Analytics API — GET /api/v1/analytics/eis/:user_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and EIS score with grade and badge when user has score data', async () => {
    prisma.eisScore.findUnique.mockResolvedValue(mockEisScore);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/eis/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.finalEisScore).toBe(85);
    expect(res.body.data.grade).toBe('A');
    expect(res.body.data.badge).toBe('Penjelajah Konservasi');
    expect(prisma.eisScore.findUnique).toHaveBeenCalledWith({
      where: { userId: 1 },
      select: expect.any(Object),
    });
    expect(eisCalculator.assignGrade).toHaveBeenCalledWith(85);
  });

  it('should return 200 and default zero scores when user has no EIS score yet', async () => {
    prisma.eisScore.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/eis/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.finalEisScore).toBe(0);
    expect(res.body.data.preZooScore).toBe(0);
    expect(res.body.data.postZooScore).toBe(0);
    expect(res.body.data.knowledgeGainScore).toBe(0);
    expect(res.body.data.grade).toBe('A'); // dari mock assignGrade
    expect(eisCalculator.assignGrade).toHaveBeenCalledWith(0);
  });

  it('should return 403 when visitor tries to access another user EIS score', async () => {
    const token = generateTestToken(2); // user 2
    const res = await request(app)
      .get('/api/v1/analytics/eis/1') // tries to access user 1
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 200 when admin accesses any user EIS score', async () => {
    prisma.eisScore.findUnique.mockResolvedValue(mockEisScore);

    const token = generateTestToken(2, 'ADMIN'); // admin
    const res = await request(app)
      .get('/api/v1/analytics/eis/1') // accesses user 1
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when user_id is not a number', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/eis/notanumber')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/analytics/eis/1');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── GET /api/v1/analytics/session/:session_id ──────────────────────────────────
describe('Analytics API — GET /api/v1/analytics/session/:session_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and session analytics with exhibits visited and quiz results', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      ...mockSession,
      interactions: mockInteractions,
      quizAttempts: mockQuizAttempts,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionSummary.sessionId).toBe(1);
    expect(res.body.data.exhibits).toHaveLength(2);
    expect(res.body.data.quizResults.preTest).not.toBeNull();
    expect(res.body.data.quizResults.postTest).not.toBeNull();
  });

  it('should return 200 and correct total duration calculated from all interactions', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      ...mockSession,
      interactions: mockInteractions,
      quizAttempts: mockQuizAttempts,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionSummary.totalDurationSeconds).toBe(1620); // 900 + 720
  });

  it('should return 200 and correct favorite_media based on most clicked media type', async () => {
    // Custom interactions to make VIDEO the clear winner
    const customInteractions = [
      {
        ...mockInteractions[0],
        clickedAudio: false,
        clickedVideo: true,
        clickedVisual: false,
        clickedInteractive: false,
      },
      {
        ...mockInteractions[1],
        clickedAudio: false,
        clickedVideo: true,
        clickedVisual: false,
        clickedInteractive: false,
      },
    ];

    prisma.visitSession.findUnique.mockResolvedValue({
      ...mockSession,
      interactions: customInteractions,
      quizAttempts: mockQuizAttempts,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionSummary.favoriteMedia).toBe('VIDEO');
  });

  it('should return 403 when session belongs to another user', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      ...mockSession,
      userId: 99, // owned by someone else
      interactions: mockInteractions,
      quizAttempts: mockQuizAttempts,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 404 when session not found', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 400 when session_id is not a number', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/analytics/session/notanumber')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/analytics/session/1');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── GET /api/v1/analytics/dashboard ─────────────────────────────────────────────
describe('Analytics API — GET /api/v1/analytics/dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  const setupDashboardMocks = () => {
    prisma.user.count.mockResolvedValue(1250);
    // first aggregate call is for summary
    // other calls are for media effectiveness (4) and age category performance (3)
    prisma.eisScore.aggregate
      .mockResolvedValueOnce({
        _avg: {
          finalEisScore: 72,
          totalDurationSeconds: 10800, // 180 minutes * 60 seconds
        },
      })
      .mockResolvedValue({
        _avg: {
          knowledgeGainScore: 45,
          finalEisScore: 72,
        },
      });

    prisma.interaction.groupBy.mockResolvedValue([
      { exhibitId: 3, _avg: { durationSeconds: 900 } },
      { exhibitId: 4, _avg: { durationSeconds: 720 } },
    ]);

    prisma.exhibit.findMany.mockResolvedValue([
      { id: 3, name: 'Harimau Sumatera' },
      { id: 4, name: 'Gajah Sumatra' },
    ]);
  };

  it('should return 200 and dashboard data when admin accesses', async () => {
    setupDashboardMocks();

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total_visitors).toBe(1250);
    expect(res.body.data.summary.avg_eis_score).toBe(72);
    expect(res.body.data.summary.avg_duration_minutes).toBe(180);
    expect(res.body.data.top_exhibits).toHaveLength(2);
    expect(res.body.data.top_exhibits[0].exhibit_name).toBe('Harimau Sumatera');
    expect(res.body.data.media_effectiveness).toHaveLength(4);
    expect(res.body.data.age_category_performance).toHaveLength(3);
  });

  it('should return 200 and filtered data when date_from and date_to are provided', async () => {
    setupDashboardMocks();

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .query({ date_from: '2026-01-01', date_to: '2026-12-31' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visitSessions: expect.objectContaining({
            some: expect.objectContaining({
              visitDate: expect.any(Object),
            }),
          }),
        }),
      })
    );
  });

  it('should return 200 and filtered data when age_category filter is provided', async () => {
    setupDashboardMocks();

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .query({ age_category: 'ADULT' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ageCategory: 'ADULT',
        }),
      })
    );
  });

  it('should return 403 when visitor role tries to access dashboard', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/analytics/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
