/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// ─── MOCKS YANG DIBUTUHKAN ───────────────────────────────────────────────────
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    exhibit: {
      findUnique: jest.fn(),
    },
    visitSession: {
      findUnique: jest.fn(),
    },
    interaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    interactiveLabLog: {
      create: jest.fn(),
    },
    learningPathContent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    exhibitMedia: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    quiz: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// DYNAMIC IMPORTS AGAR MOCK BEKERJA
const prisma = (await import('../src/config/prisma.js')).default;
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

// ─── Helper ────────────────────────────────────────────────────────────────────
const generateTestToken = (userId, role = 'VISITOR') =>
  jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);

// ─── DATA FIXTURE YANG DIBUTUHKAN ──────────────────────────────────────────────
const mockExhibit = {
  id: 3,
  name: 'Harimau Sumatera',
  zoneName: 'Zona Mamalia',
  qrCodeIdentifier: 'EXHIBIT-HARIMAU-001',
  isActive: true,
};

const mockSession = {
  id: 1,
  userId: 1,
  isCompleted: false,
};

const mockInteraction = {
  id: 89,
  userId: 1,
  sessionId: 1,
  exhibitId: 3,
  startTime: new Date(Date.now() - 900000),
  endTime: null,
  durationSeconds: null,
  clickedAudio: false,
  clickedVideo: false,
  clickedVisual: false,
  clickedInteractive: false,
};

const mockClosedInteraction = {
  ...mockInteraction,
  endTime: new Date(),
  durationSeconds: 900,
};

const mockLearningContent = [
  {
    id: 1,
    exhibitId: 3,
    ageCategory: 'ADULT',
    contentTitle: 'Harimau Sumatera & Konservasi',
    contentBody: 'Harimau Sumatera adalah...',
  }
];

const mockMediaList = [
  { id: 7, exhibitId: 3, ageCategory: 'ADULT', mediaType: 'AUDIO', title: 'Auman Harimau', fileUrl: 'https://res.cloudinary.com/test/audio.mp3' },
  { id: 8, exhibitId: 3, ageCategory: 'ADULT', mediaType: 'VIDEO', title: 'Video Harimau', fileUrl: 'https://res.cloudinary.com/test/video.mp4' },
];

// ─── POST /api/v1/track/checkin ──────────────────────────────────────────────
describe('Track API — POST /api/v1/track/checkin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 and interaction_id when qr_code is valid and session is active', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
    prisma.visitSession.findUnique.mockResolvedValue(mockSession);
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.interaction.create.mockResolvedValue(mockInteraction);
    prisma.learningPathContent.findMany.mockResolvedValue(mockLearningContent);
    prisma.quiz.findMany.mockResolvedValue([]);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1, qrCodeIdentifier: 'EXHIBIT-HARIMAU-001' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.interaction.id).toBe(89);
  });

  it('should return 201 and return existing interaction when user already checked in to same exhibit in same session', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
    prisma.visitSession.findUnique.mockResolvedValue(mockSession);
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.interaction.findFirst.mockResolvedValue(mockInteraction);
    prisma.learningPathContent.findMany.mockResolvedValue(mockLearningContent);
    prisma.quiz.findMany.mockResolvedValue([]);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1, qrCodeIdentifier: 'EXHIBIT-HARIMAU-001' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when qr_code_identifier not found in database', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
    prisma.visitSession.findUnique.mockResolvedValue(mockSession);
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1, qrCodeIdentifier: 'EXHIBIT-HARIMAU-UNKNOWN' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
  });

  it('should return 404 when session not found', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
    prisma.visitSession.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 999, qrCodeIdentifier: 'EXHIBIT-HARIMAU-001' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 404 when session belongs to another user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
    prisma.visitSession.findUnique.mockResolvedValue({ ...mockSession, userId: 99 });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1, qrCodeIdentifier: 'EXHIBIT-HARIMAU-001' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 400 when required fields are missing (sessionId or qrCodeIdentifier)', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/track/checkin')
      .send({ sessionId: 1, qrCodeIdentifier: 'EXHIBIT-HARIMAU-001' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── PATCH /api/v1/track/interact ─────────────────────────────────────────────
describe('Track API — PATCH /api/v1/track/interact', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 when media type AUDIO is logged successfully', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interaction.update.mockResolvedValue({ ...mockInteraction, clickedAudio: true });

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'AUDIO' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clickedAudio).toBe(true);
  });

  it('should return 200 when media type VIDEO is logged successfully', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interaction.update.mockResolvedValue({ ...mockInteraction, clickedVideo: true });

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'VIDEO' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clickedVideo).toBe(true);
  });

  it('should return 200 when media type IMAGE_INFOGRAPHIC is logged successfully', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interaction.update.mockResolvedValue({ ...mockInteraction, clickedVisual: true });

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'IMAGE_INFOGRAPHIC' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clickedVisual).toBe(true);
  });

  it('should return 200 when media type INTERACTIVE_LAB is logged successfully', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interaction.update.mockResolvedValue({ ...mockInteraction, clickedInteractive: true });

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'INTERACTIVE_LAB' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clickedInteractive).toBe(true);
  });

  it('should return 404 when interaction not found', async () => {
    prisma.interaction.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 999, mediaType: 'AUDIO' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INTERACTION_NOT_FOUND');
  });

  it('should return 403 when interaction belongs to another user', async () => {
    prisma.interaction.findUnique.mockResolvedValue({ ...mockInteraction, userId: 99 });

    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'AUDIO' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 400 when media_type is invalid enum value', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, mediaType: 'INVALID_TYPE' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .patch('/api/v1/track/interact')
      .send({ interactionId: 89, mediaType: 'AUDIO' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/track/lab-log ──────────────────────────────────────────────
describe('Track API — POST /api/v1/track/lab-log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 when lab log is created successfully', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interactiveLabLog.create.mockResolvedValue({
      id: 12,
      interactionId: 89,
      gameName: 'Tiger Lab',
      actionTaken: 'FEED',
      scoreAchieved: 100,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/lab-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, gameName: 'Tiger Lab', actionTaken: 'FEED', scoreAchieved: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gameName).toBe('Tiger Lab');
  });

  it('should return 404 when interaction not found', async () => {
    prisma.interaction.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/lab-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 999, gameName: 'Tiger Lab', actionTaken: 'FEED' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INTERACTION_NOT_FOUND');
  });

  it('should return 403 when interaction belongs to another user', async () => {
    prisma.interaction.findUnique.mockResolvedValue({ ...mockInteraction, userId: 99 });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/lab-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, gameName: 'Tiger Lab', actionTaken: 'FEED' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 400 when required fields are missing (gameName or actionTaken)', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/lab-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89, gameName: 'Tiger Lab' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/track/lab-log')
      .send({ interactionId: 89, gameName: 'Tiger Lab', actionTaken: 'FEED' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/track/checkout ─────────────────────────────────────────────
describe('Track API — POST /api/v1/track/checkout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and duration_seconds when checkout is successful', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockInteraction);
    prisma.interaction.update.mockResolvedValue(mockClosedInteraction);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.durationSeconds).toBe(900);
  });

  it('should return 409 when interaction is already closed (end_time already set)', async () => {
    prisma.interaction.findUnique.mockResolvedValue(mockClosedInteraction);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INTERACTION_ALREADY_CLOSED');
  });

  it('should return 404 when interaction not found', async () => {
    prisma.interaction.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 999 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INTERACTION_NOT_FOUND');
  });

  it('should return 403 when interaction belongs to another user', async () => {
    prisma.interaction.findUnique.mockResolvedValue({ ...mockInteraction, userId: 99 });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ interactionId: 89 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/track/checkout')
      .send({ interactionId: 89 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
