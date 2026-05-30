/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// ─── MOCK DI AWAL SEBELUM IMPORTS LAINNYA ─────────────────────────────────────
jest.unstable_mockModule('../src/config/prisma.js', () => {
  const mockPrisma = {
    visitSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    retentionSchedule: {
      createMany: jest.fn(),
    },
    // $transaction menerima callback dan mengeksekusinya dengan mockPrisma sebagai tx
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { default: mockPrisma };
});

// ─── DYNAMIC IMPORTS AGAR MOCK BEKERJA ────────────────────────────────────────
const prisma = (await import('../src/config/prisma.js')).default;
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

// ─── Helper ────────────────────────────────────────────────────────────────────
const generateTestToken = (userId, role = 'VISITOR') =>
  jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);

// ─── POST /api/v1/sessions/start ──────────────────────────────────────────────
describe('Sessions API — POST /api/v1/sessions/start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 and session data when no active session exists', async () => {
    prisma.visitSession.findFirst.mockResolvedValue(null); // tidak ada sesi aktif
    prisma.visitSession.create.mockResolvedValue({
      id: 1,
      userId: 1,
      visitDate: new Date('2026-05-17'),
      checkInAt: new Date(),
      isCompleted: false,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/start')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.isCompleted).toBe(false);
    expect(prisma.visitSession.create).toHaveBeenCalledTimes(1);
  });

  it('should return 409 when user already has an active session', async () => {
    prisma.visitSession.findFirst.mockResolvedValue({
      id: 5,
      userId: 1,
      isCompleted: false,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/start')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SESSION_ALREADY_ACTIVE');
    expect(prisma.visitSession.create).not.toHaveBeenCalled();
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).post('/api/v1/sessions/start');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when JWT token is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/sessions/start')
      .set('Authorization', 'Bearer token.palsu.invalid');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/sessions/end ────────────────────────────────────────────────
describe('Sessions API — POST /api/v1/sessions/end', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200, update session, and create retention schedules', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      isCompleted: false,
    });
    prisma.visitSession.update.mockResolvedValue({
      id: 1,
      userId: 1,
      visitDate: new Date('2026-05-17'),
      checkInAt: new Date(),
      checkOutAt: new Date(),
      isCompleted: true,
    });
    prisma.retentionSchedule.createMany.mockResolvedValue({ count: 2 });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCompleted).toBe(true);
    expect(res.body.data.checkOutAt).toBeDefined();

    // Verifikasi injeksi retention_schedules dipanggil dengan benar
    expect(prisma.retentionSchedule.createMany).toHaveBeenCalledTimes(1);
    const createManyArgs = prisma.retentionSchedule.createMany.mock.calls[0][0];
    expect(createManyArgs.data).toHaveLength(2);
    expect(createManyArgs.data[0].quizType).toBe('RETENTION_1W');
    expect(createManyArgs.data[1].quizType).toBe('RETENTION_1M');
    expect(createManyArgs.skipDuplicates).toBe(true);
  });

  it('should return 404 when session_id does not exist', async () => {
    prisma.visitSession.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 999 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 403 when session belongs to another user', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      id: 2,
      userId: 99, // beda dengan token userId = 1
      isCompleted: false,
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 2 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 400 when session is already completed', async () => {
    prisma.visitSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      isCompleted: true, // sudah diakhiri
    });

    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SESSION_ALREADY_ENDED');
  });

  it('should return 400 when session_id is missing from body (validation)', async () => {
    const token = generateTestToken(1);
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post('/api/v1/sessions/end')
      .send({ session_id: 1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── GET /api/v1/sessions/history ─────────────────────────────────────────────
describe('Sessions API — GET /api/v1/sessions/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and array of session history', async () => {
    prisma.visitSession.findMany.mockResolvedValue([
      {
        id: 3,
        visitDate: new Date('2026-05-15'),
        checkInAt: new Date('2026-05-15T08:00:00Z'),
        checkOutAt: new Date('2026-05-15T12:00:00Z'),
        isCompleted: true,
      },
      {
        id: 1,
        visitDate: new Date('2026-05-10'),
        checkInAt: new Date('2026-05-10T09:00:00Z'),
        checkOutAt: new Date('2026-05-10T11:00:00Z'),
        isCompleted: true,
      },
    ]);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/sessions/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('should return 200 and empty array when user has no sessions', async () => {
    prisma.visitSession.findMany.mockResolvedValue([]);

    const token = generateTestToken(1);
    const res = await request(app)
      .get('/api/v1/sessions/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/v1/sessions/history');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
