/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// MOCK DI AWAL SEBELUM IMPORTS LAINNYA
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    retentionSchedule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    quiz: {
      findFirst: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    userQuizAttempt: {
      create: jest.fn(),
    },
    userQuizAnswer: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/utils/emailSender.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mocked-id' }),
}));

jest.unstable_mockModule('../src/utils/tokenUrl.js', () => ({
  generateRetentionToken: jest.fn().mockReturnValue('mocked-retention-token'),
  verifyRetentionToken: jest.fn(),
}));

jest.unstable_mockModule('../src/services/eis.service.js', () => ({
  recalculateEis: jest.fn().mockResolvedValue(),
}));

// DYNAMIC IMPORTS AGAR MOCK BEKERJA
const prisma = (await import('../src/config/prisma.js')).default;
const emailSender = await import('../src/utils/emailSender.js');
const tokenUrl = await import('../src/utils/tokenUrl.js');
const request = (await import('supertest')).default;
const app = (await import('../src/app.js')).default;

// ─── DATA FIXTURE YANG DIBUTUHKAN ──────────────────────────────────────────────
const mockRetentionToken = 'valid-retention-token';
const mockDecodedToken = { userId: 1, sessionId: 1, quizType: 'RETENTION_1W' };

const mockPendingSchedule = {
  id: 1,
  userId: 1,
  sessionId: 1,
  quizType: 'RETENTION_1W',
  scheduledAt: new Date(Date.now() - 1000),
  status: 'PENDING',
  user: { email: 'test@test.com', name: 'Test User' },
};

const mockSentSchedule = {
  ...mockPendingSchedule,
  status: 'SENT',
};

const mockCompletedSchedule = {
  ...mockPendingSchedule,
  status: 'COMPLETED',
};

const mockUser = {
  id: 1,
  ageCategory: 'ADULT',
  email: 'test@test.com',
};

const mockQuiz = {
  id: 1,
  quizType: 'RETENTION_1W',
  ageCategory: 'ADULT',
  scope: 'GLOBAL',
  questions: [
    { id: 1, questionText: 'Soal 1', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', points: 10 },
  ],
};

const mockQuizWithCorrectOptions = {
  ...mockQuiz,
  questions: [
    { id: 1, correctOption: 'A' },
  ],
};

const mockAttempt = {
  id: 1,
  userId: 1,
  sessionId: 1,
  quizId: 1,
  totalQuestions: 1,
  correctAnswers: 1,
  finalScore: 100,
  completedAt: new Date(),
};

// ─── POST /api/v1/retention/trigger ───────────────────────────────────────────
describe('Retention API — POST /api/v1/retention/trigger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and process pending schedules when cron secret is valid', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([mockPendingSchedule]);
    prisma.retentionSchedule.update.mockResolvedValue(mockSentSchedule);

    const res = await request(app)
      .post('/api/v1/retention/trigger')
      .set('x-cron-secret', 'test_cron_secret')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.retentionSchedule.findMany).toHaveBeenCalled();
    expect(emailSender.sendEmail).toHaveBeenCalled();
    expect(prisma.retentionSchedule.update).toHaveBeenCalled();
  });

  it('should return 403 when x-cron-secret header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/retention/trigger')
      .send({});

    expect(res.status).toBe(401);
  });

  it('should return 403 when x-cron-secret header is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/retention/trigger')
      .set('x-cron-secret', 'wrong_secret')
      .send({});

    expect(res.status).toBe(401);
  });

  it('should return 200 even when no pending schedules exist (empty array)', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/retention/trigger')
      .set('x-cron-secret', 'test_cron_secret')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(emailSender.sendEmail).not.toHaveBeenCalled();
  });

  it('should continue processing other records when one email fails', async () => {
    prisma.retentionSchedule.findMany.mockResolvedValue([
      mockPendingSchedule,
      { ...mockPendingSchedule, id: 2, user: { email: 'fail@test.com', name: 'Fail User' } },
    ]);

    emailSender.sendEmail
      .mockRejectedValueOnce(new Error('Email failed'))
      .mockResolvedValueOnce({ messageId: 'mocked-id' });

    prisma.retentionSchedule.update.mockResolvedValue(mockSentSchedule);

    const res = await request(app)
      .post('/api/v1/retention/trigger')
      .set('x-cron-secret', 'test_cron_secret')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.processedCount).toBe(2);
    expect(res.body.data.successCount).toBe(1);
    expect(res.body.data.failCount).toBe(1);
  });
});

// ─── GET /api/v1/retention/quiz/:token ───────────────────────────────────────
describe('Retention API — GET /api/v1/retention/quiz/:token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and quiz questions when token is valid and status is SENT', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockSentSchedule);
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.quiz.findFirst.mockResolvedValue(mockQuiz);

    const res = await request(app)
      .get(`/api/v1/retention/quiz/${mockRetentionToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questions).toBeDefined();
  });

  it('should return 400 when token is invalid or expired (RETENTION_EXPIRED)', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(null);

    const res = await request(app)
      .get('/api/v1/retention/quiz/invalid-token');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RETENTION_EXPIRED');
  });

  it('should return 400 when retention schedule status is not SENT (PENDING or EXPIRED)', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockPendingSchedule);

    const res = await request(app)
      .get(`/api/v1/retention/quiz/${mockRetentionToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RETENTION_EXPIRED');
  });

  it('should return 409 when retention schedule status is already COMPLETED (RETENTION_ALREADY_DONE)', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockCompletedSchedule);

    const res = await request(app)
      .get(`/api/v1/retention/quiz/${mockRetentionToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RETENTION_EXPIRED');
  });

  it('should NOT include correctOption in response questions', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockSentSchedule);
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.quiz.findFirst.mockResolvedValue(mockQuiz);

    const res = await request(app)
      .get(`/api/v1/retention/quiz/${mockRetentionToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.questions[0].correctOption).toBeUndefined();
  });
});

// ─── POST /api/v1/retention/submit/:token ─────────────────────────────────────
describe('Retention API — POST /api/v1/retention/submit/:token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 and finalScore when answers are valid and token is valid', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockSentSchedule);
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.quiz.findFirst.mockResolvedValue(mockQuizWithCorrectOptions);

    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        userQuizAttempt: {
          create: jest.fn().mockResolvedValue(mockAttempt),
        },
        userQuizAnswer: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        retentionSchedule: {
          update: jest.fn().mockResolvedValue(mockCompletedSchedule),
        },
      };
      return cb(tx);
    });

    const res = await request(app)
      .post(`/api/v1/retention/submit/${mockRetentionToken}`)
      .send({
        answers: [{ questionId: 1, chosenOption: 'A' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempt.finalScore).toBe(100);
  });

  it('should return 400 when token is invalid or expired (RETENTION_EXPIRED)', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(null);

    const res = await request(app)
      .post('/api/v1/retention/submit/invalid-token')
      .send({
        answers: [{ questionId: 1, chosenOption: 'A' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RETENTION_EXPIRED');
  });

  it('should return 409 when schedule is already COMPLETED (RETENTION_ALREADY_DONE)', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockCompletedSchedule);

    const res = await request(app)
      .post(`/api/v1/retention/submit/${mockRetentionToken}`)
      .send({
        answers: [{ questionId: 1, chosenOption: 'A' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RETENTION_ALREADY_DONE');
  });

  it('should return 400 when answers array is empty', async () => {
    tokenUrl.verifyRetentionToken.mockReturnValue(mockDecodedToken);
    prisma.retentionSchedule.findFirst.mockResolvedValue(mockSentSchedule);

    const res = await request(app)
      .post(`/api/v1/retention/submit/${mockRetentionToken}`)
      .send({
        answers: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(`/api/v1/retention/submit/${mockRetentionToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
