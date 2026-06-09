/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    quiz: { findFirst: jest.fn(), findUnique: jest.fn() },
    question: { findMany: jest.fn() },
    visitSession: { findUnique: jest.fn(), findMany: jest.fn() },
    userQuizAttempt: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    userQuizAnswer: { createMany: jest.fn() },
    retentionSchedule: { findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const prisma = (await import('../src/config/prisma.js')).default;
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

const generateTestToken = (userId, role = 'VISITOR') =>
  jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);

const mockSessionData = { userId: 1, user: { ageCategory: 'ADULT' } };
const mockQuizData = {
  id: 1,
  title: 'Kuis Test',
  quizType: 'PRE_ZOO',
  scope: 'GLOBAL',
  ageCategory: 'ADULT',
  exhibitId: null,
  questions: [
    { id: 1, questionText: 'Soal 1', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', points: 10 },
  ],
};

describe('Quizzes API — GET /api/v1/quizzes/fetch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and quiz questions when params are valid', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.quiz.findFirst.mockResolvedValue(mockQuizData);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questions).toBeDefined();
  });

  it('should return 404 when no quiz found for given type and ageCategory', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.quiz.findFirst.mockResolvedValue(null);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('QUIZ_NOT_FOUND');
  });

  it('should return 400 when required query params are missing', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when type is invalid enum value', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'INVALID_TYPE' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should NOT include correctOption in response questions', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.quiz.findFirst.mockResolvedValue(mockQuizData);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(200);
    res.body.data.questions.forEach((q) => {
      expect(q.correctOption).toBeUndefined();
    });
  });

  it('should dynamically limit question counts based on age category for PRE_ZOO / POST_ZOO', async () => {
    const questions15 = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      questionText: `Soal ${i + 1}`,
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      points: 10,
    }));
    // Case 1: CHILD (limit to 5)
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 1, user: { ageCategory: 'CHILD' } });
    prisma.quiz.findFirst.mockResolvedValue({ ...mockQuizData, questions: [...questions15] });
    let token = generateTestToken(1);
    let res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(200);
    expect(res.body.data.questions.length).toBe(5);

    // Case 2: TEEN (limit to 8)
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 1, user: { ageCategory: 'TEEN' } });
    prisma.quiz.findFirst.mockResolvedValue({ ...mockQuizData, questions: [...questions15] });
    token = generateTestToken(1);
    res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(200);
    expect(res.body.data.questions.length).toBe(8);

    // Case 3: ADULT (limit to 10)
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 1, user: { ageCategory: 'ADULT' } });
    prisma.quiz.findFirst.mockResolvedValue({ ...mockQuizData, questions: [...questions15] });
    token = generateTestToken(1);
    res = await request(app)
      .get('/api/v1/quizzes/fetch')
      .set('Authorization', `Bearer ${token}`)
      .query({ sessionId: '1', type: 'PRE_ZOO' });
    expect(res.status).toBe(200);
    expect(res.body.data.questions.length).toBe(10);
  });
});

describe('Quizzes API — POST /api/v1/quizzes/submit', () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    sessionId: 1,
    quizId: 1,
    answers: [
      { questionId: 1, chosenOption: 'A' },
      { questionId: 2, chosenOption: 'B' },
    ],
  };

  it('should return 201 and finalScore calculated as percentage', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.userQuizAttempt.findFirst.mockResolvedValue(null);
    prisma.quiz.findUnique.mockResolvedValue({
      id: 1,
      quizType: 'PRE_ZOO',
      questions: [
        { id: 1, correctOption: 'A' },
        { id: 2, correctOption: 'B' },
      ],
    });
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        userQuizAttempt: { create: jest.fn().mockResolvedValue({ id: 5, finalScore: 100, correctAnswers: 2, totalQuestions: 2, completedAt: new Date() }) },
        userQuizAnswer: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      return cb(tx);
    });
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.finalScore).toBe(100);
  });

  it('should return 409 when quiz already submitted in same session', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.userQuizAttempt.findFirst.mockResolvedValue({ id: 3 });
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('QUIZ_ALREADY_SUBMITTED');
  });

  it('should return 404 when quiz not found', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(mockSessionData);
    prisma.userQuizAttempt.findFirst.mockResolvedValue(null);
    prisma.quiz.findUnique.mockResolvedValue(null);
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('QUIZ_NOT_FOUND');
  });

  it('should return 400 when answers array is empty', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1, quizId: 1, answers: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/quizzes/submit')
      .send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

describe('Quizzes API — GET /api/v1/quizzes/result/:session_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and knowledge_gain when pre and post test exist', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 1 });
    prisma.userQuizAttempt.findMany.mockResolvedValue([
      { finalScore: 60, quiz: { quizType: 'PRE_ZOO' } },
      { finalScore: 80, quiz: { quizType: 'POST_ZOO' } },
    ]);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/result/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.knowledgeGain).toBe(20);
  });

  it('should return 200 and knowledge_gain is never negative', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 1 });
    prisma.userQuizAttempt.findMany.mockResolvedValue([
      { finalScore: 80, quiz: { quizType: 'PRE_ZOO' } },
      { finalScore: 50, quiz: { quizType: 'POST_ZOO' } },
    ]);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/result/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.knowledgeGain).toBe(0);
  });

  it('should return 403 when session belongs to another user', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({ userId: 99 });
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/result/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 404 when session not found', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(null);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/result/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 400 when session_id is not a number', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/result/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/quizzes/result/1');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

describe('Quizzes API — GET /api/v1/quizzes/retention-status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and list of retention schedules', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([
      { id: 1, quizType: 'RETENTION_1W', scheduledAt: new Date(), status: 'PENDING' },
      { id: 2, quizType: 'RETENTION_1M', scheduledAt: new Date(), status: 'PENDING' },
    ]);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/retention-status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('should return 200 and empty array when no schedules exist', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([]);
    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/retention-status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/quizzes/retention-status');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return score for COMPLETED retention quizzes', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([
      { id: 1, userId: 1, sessionId: 10, quizType: 'RETENTION_1W', status: 'COMPLETED', scheduledAt: new Date() },
    ]);
    prisma.userQuizAttempt.findFirst.mockResolvedValue({ finalScore: 85 });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/retention-status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].score).toBe(85);
    expect(prisma.userQuizAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 1,
        sessionId: 10,
        quiz: { quizType: 'RETENTION_1W' }
      },
      select: { finalScore: true, completedAt: true }
    });
  });

  it('should generate token for active SENT retention quizzes', async () => {
    const sentTime = new Date(); // now, not expired
    prisma.retentionSchedule.findMany.mockResolvedValue([
      { id: 2, userId: 1, sessionId: 10, quizType: 'RETENTION_1W', status: 'SENT', sentAt: sentTime, scheduledAt: new Date() },
    ]);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/retention-status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].token).toBeDefined();
    expect(res.body.data[0].status).toBe('SENT');
  });

  it('should mark SENT retention quizzes as EXPIRED if sent more than 24 hours ago', async () => {
    const sentTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago, expired
    prisma.retentionSchedule.findMany.mockResolvedValue([
      { id: 3, userId: 1, sessionId: 10, quizType: 'RETENTION_1W', status: 'SENT', sentAt: sentTime, scheduledAt: new Date() },
    ]);
    prisma.retentionSchedule.update.mockResolvedValue({ status: 'EXPIRED' });

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/quizzes/retention-status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('EXPIRED');
    expect(res.body.data[0].token).toBeUndefined();
    expect(prisma.retentionSchedule.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { status: 'EXPIRED' }
    });
  });
});
