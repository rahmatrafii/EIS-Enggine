/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// MOCK DI AWAL SEBELUM IMPORTS LAINNYA
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    exhibit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    learningPathContent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    exhibitMedia: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    quiz: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    interaction: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    eisScore: {
      aggregate: jest.fn(),
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

// ─── DATA FIXTURES ─────────────────────────────────────────────────────────────
const mockExhibit = {
  id: 3,
  name: 'Harimau Sumatera',
  zoneName: 'Zona Mamalia',
  description: 'Kandang harimau sumatera',
  qrCodeIdentifier: 'EXHIBIT-HARIMAU-A3F9X',
  isActive: true,
  createdAt: new Date(),
  learningContent: [
    { ageCategory: 'ADULT' },
    { ageCategory: 'TEEN' },
  ],
  media: [
    { ageCategory: 'ADULT' },
    { ageCategory: 'CHILD' },
  ],
};

const mockInactiveExhibit = {
  ...mockExhibit,
  isActive: false,
};

const mockContent = {
  id: 1,
  exhibitId: 3,
  ageCategory: 'ADULT',
  contentTitle: 'Harimau Sumatera & Konservasi',
  contentBody: 'Harimau Sumatera adalah...',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMedia = {
  id: 7,
  exhibitId: 3,
  ageCategory: 'ADULT',
  mediaType: 'AUDIO',
  title: 'Auman Harimau',
  fileUrl: 'https://res.cloudinary.com/test/audio.mp3',
  createdAt: new Date(),
};

const mockQuiz = {
  id: 1,
  exhibitId: null,
  scope: 'GLOBAL',
  title: 'Kuis Awal Kebun Binatang — Dewasa',
  quizType: 'PRE_ZOO',
  ageCategory: 'ADULT',
  createdAt: new Date(),
};

const mockQuestions = [
  {
    questionText: 'Apa status konservasi Harimau Sumatera?',
    optionA: 'Rentan',
    optionB: 'Terancam',
    optionC: 'Kritis',
    optionD: 'Punah',
    correctOption: 'C',
    points: 10,
  },
];

const validCreateExhibitBody = {
  name: 'Gajah Sumatra',
  zoneName: 'Zona Mamalia',
  description: 'Kandang gajah sumatra',
};

const validCreateContentBody = {
  exhibitId: 3,
  ageCategory: 'ADULT',
  contentTitle: 'Konten Test',
  contentBody: 'Isi konten test yang panjang',
};

const validCreateMediaBody = {
  exhibitId: 3,
  ageCategory: 'ADULT',
  mediaType: 'AUDIO',
  title: 'Audio Test',
  fileUrl: 'https://res.cloudinary.com/test/audio.mp3',
};

const validCreateQuizBody = {
  exhibitId: null,
  scope: 'GLOBAL',
  title: 'Kuis Test',
  quizType: 'PRE_ZOO',
  ageCategory: 'ADULT',
  questions: mockQuestions,
};

// ─── POST /api/v1/admin/exhibits ──────────────────────────────────────────────
describe('Admin API — POST /api/v1/admin/exhibits', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 and exhibit data with qrCodeIdentifier when creation is successful', async () => {
    prisma.exhibit.findFirst.mockResolvedValue(null);
    prisma.exhibit.create.mockResolvedValue(mockExhibit);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateExhibitBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.qrCodeIdentifier).toBe(mockExhibit.qrCodeIdentifier);
    expect(prisma.exhibit.findFirst).toHaveBeenCalled();
    expect(prisma.exhibit.create).toHaveBeenCalled();
  });

  it('should return 409 when exhibit name already exists (case insensitive)', async () => {
    prisma.exhibit.findFirst.mockResolvedValue(mockExhibit);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateExhibitBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(prisma.exhibit.create).not.toHaveBeenCalled();
  });

  it('should return 400 when required fields are missing (name or zoneName)', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hanya Nama' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when name exceeds 100 characters', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'a'.repeat(101),
        zoneName: 'Zona Mamalia',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor role tries to create exhibit', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateExhibitBody);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/exhibits')
      .send(validCreateExhibitBody);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── GET /api/v1/admin/exhibits ───────────────────────────────────────────────
describe('Admin API — GET /api/v1/admin/exhibits', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and list of exhibits with content_status for each age category', async () => {
    prisma.exhibit.findMany.mockResolvedValue([mockExhibit]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    
    const exhibitData = res.body.data[0];
    expect(exhibitData.content_status).toBeDefined();
    expect(exhibitData.content_status.CHILD).toEqual({ text: false, media: true });
    expect(exhibitData.content_status.TEEN).toEqual({ text: true, media: false });
    expect(exhibitData.content_status.ADULT).toEqual({ text: true, media: true });
    expect(prisma.exhibit.findMany).toHaveBeenCalled();
  });

  it('should return 200 and correctly treat ALL age category as active for CHILD, TEEN, and ADULT in list view', async () => {
    const mockExhibitWithAll = {
      ...mockExhibit,
      learningContent: [
        { ageCategory: 'ALL' },
      ],
      media: [
        { ageCategory: 'ALL' },
      ],
    };
    prisma.exhibit.findMany.mockResolvedValue([mockExhibitWithAll]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const exhibitData = res.body.data[0];
    expect(exhibitData.content_status.CHILD).toEqual({ text: true, media: true });
    expect(exhibitData.content_status.TEEN).toEqual({ text: true, media: true });
    expect(exhibitData.content_status.ADULT).toEqual({ text: true, media: true });
  });

  it('should return 200 and filtered exhibits when is_active=true query param is provided', async () => {
    prisma.exhibit.findMany.mockResolvedValue([mockExhibit]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .query({ is_active: 'true' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.exhibit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
        }),
      })
    );
  });

  it('should return 200 and filtered exhibits when zone_name query param is provided', async () => {
    prisma.exhibit.findMany.mockResolvedValue([mockExhibit]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .query({ zone_name: 'Zona Mamalia' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.exhibit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          zoneName: expect.objectContaining({
            equals: 'Zona Mamalia',
            mode: 'insensitive',
          }),
        }),
      })
    );
  });

  it('should return 200 and empty array when no exhibits match filter', async () => {
    prisma.exhibit.findMany.mockResolvedValue([]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .query({ zone_name: 'Zona Kosong' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should return 403 when visitor role tries to access', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .get('/api/v1/admin/exhibits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/v1/admin/exhibits');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── DELETE /api/v1/admin/exhibits/:exhibit_id ───────────────────────────────
describe('Admin API — DELETE /api/v1/admin/exhibits/:exhibit_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 when exhibit is successfully deactivated (soft delete)', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.exhibit.update.mockResolvedValue(mockInactiveExhibit);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(prisma.exhibit.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { isActive: false },
      select: expect.any(Object),
    });
  });

  it('should return 404 when exhibit_id does not exist', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/exhibits/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    expect(prisma.exhibit.update).not.toHaveBeenCalled();
  });

  it('should return 409 when exhibit is already inactive (isActive = false)', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockInactiveExhibit);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(prisma.exhibit.update).not.toHaveBeenCalled();
  });

  it('should return 400 when exhibit_id is not a number', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/exhibits/notanumber')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor role tries to delete', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .delete('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app).delete('/api/v1/admin/exhibits/3');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/admin/content ───────────────────────────────────────────────
describe('Admin API — POST /api/v1/admin/content', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 when content is created successfully (upsert — new record)', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.learningPathContent.upsert.mockResolvedValue(mockContent);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateContentBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contentTitle).toBe(mockContent.contentTitle);
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(prisma.learningPathContent.upsert).toHaveBeenCalled();
  });

  it('should return 200 when content is updated successfully (upsert — existing record)', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.learningPathContent.upsert.mockResolvedValue(mockContent);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateContentBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when exhibit does not exist or is not active', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateContentBody);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    expect(prisma.learningPathContent.upsert).not.toHaveBeenCalled();
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send({ exhibitId: 3 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when ageCategory is invalid enum value', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateContentBody,
        ageCategory: 'BABY',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor role tries to create content', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .post('/api/v1/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateContentBody);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/content')
      .send(validCreateContentBody);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/admin/media ─────────────────────────────────────────────────
describe('Admin API — POST /api/v1/admin/media', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 when media is added successfully', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.exhibitMedia.create.mockResolvedValue(mockMedia);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateMediaBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileUrl).toBe(mockMedia.fileUrl);
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(prisma.exhibitMedia.create).toHaveBeenCalled();
  });

  it('should return 201 when media with ageCategory ALL is added successfully', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.exhibitMedia.create.mockResolvedValue({ ...mockMedia, ageCategory: 'ALL' });

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validCreateMediaBody, ageCategory: 'ALL' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ageCategory).toBe('ALL');
  });

  it('should return 404 when exhibit does not exist or is not active', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateMediaBody);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    expect(prisma.exhibitMedia.create).not.toHaveBeenCalled();
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send({ exhibitId: 3 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when mediaType is invalid enum value', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateMediaBody,
        mediaType: 'GIF',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when fileUrl is not a valid URL format', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateMediaBody,
        fileUrl: 'bukan-url-yang-valid',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor role tries to add media', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateMediaBody);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media')
      .send(validCreateMediaBody);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/v1/admin/quizzes ───────────────────────────────────────────────
describe('Admin API — POST /api/v1/admin/quizzes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock untuk transaction sesuai Aturan 9
    prisma.$transaction.mockImplementation(async (cb) => {
      return cb({
        quiz: {
          create: jest.fn().mockResolvedValue(mockQuiz),
        },
        question: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      });
    });
  });

  it('should return 201 and quizId with totalQuestionsAdded when quiz is created successfully', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateQuizBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quizId).toBe(mockQuiz.id);
    expect(res.body.data.totalQuestionsAdded).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should return 201 when scope is EXHIBIT and exhibitId is provided and valid', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        scope: 'EXHIBIT',
        exhibitId: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should return 400 when scope is EXHIBIT but exhibitId is missing (VALIDATION_ERROR)', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        scope: 'EXHIBIT',
        exhibitId: null,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should return 400 when scope is GLOBAL but exhibitId is provided (VALIDATION_ERROR)', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        scope: 'GLOBAL',
        exhibitId: 3,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should return 404 when scope is EXHIBIT but exhibitId does not exist', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        scope: 'EXHIBIT',
        exhibitId: 999,
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should return 400 when questions array is empty', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        questions: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when required quiz fields are missing', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Kuis Tanpa Bidang Lain' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when correctOption is invalid (not A B C or D)', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validCreateQuizBody,
        questions: [
          {
            ...mockQuestions[0],
            correctOption: 'E',
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor role tries to create quiz', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateQuizBody);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/quizzes')
      .send(validCreateQuizBody);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ─── GET /api/v1/admin/exhibits/:exhibit_id ────────────────────────────────────
describe('Admin API — GET /api/v1/admin/exhibits/:exhibit_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and exhibit detail when id is valid and exists', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.interaction.count.mockResolvedValue(10);
    prisma.interaction.aggregate.mockResolvedValue({ _avg: { durationSeconds: 600 } });
    prisma.interaction.findMany.mockResolvedValue([
      { sessionId: 'session-1', clickedAudio: true, clickedVideo: false, clickedVisual: false, clickedInteractive: false },
    ]);
    prisma.eisScore.aggregate.mockResolvedValue({ _avg: { knowledgeGainScore: 40 } });

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(3);
    expect(res.body.data.name).toBe(mockExhibit.name);
    expect(res.body.data.stats.totalVisitors).toBe(10);
    expect(res.body.data.stats.avgDurationMinutes).toBe(10);
    expect(res.body.data.stats.favoriteMedia).toBe('Audio');
    expect(res.body.data.stats.knowledgeGainPercent).toBe(40);
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      include: { learningContent: true, media: true },
    });
  });

  it('should return 200 and correctly treat ALL age category as active for CHILD, TEEN, and ADULT in detail view', async () => {
    const mockExhibitWithAll = {
      ...mockExhibit,
      learningContent: [
        { ageCategory: 'ALL' },
      ],
      media: [
        { ageCategory: 'ALL' },
      ],
    };
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibitWithAll);
    prisma.interaction.count.mockResolvedValue(10);
    prisma.interaction.aggregate.mockResolvedValue({ _avg: { durationSeconds: 600 } });
    prisma.interaction.findMany.mockResolvedValue([]);
    prisma.eisScore.aggregate.mockResolvedValue({ _avg: { knowledgeGainScore: 40 } });

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content_status.CHILD).toEqual({ text: true, media: true });
    expect(res.body.data.content_status.TEEN).toEqual({ text: true, media: true });
    expect(res.body.data.content_status.ADULT).toEqual({ text: true, media: true });
  });

  it('should return 404 when exhibit id does not exist', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
  });

  it('should return 400 when exhibit id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/exhibits/notanumber')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to get exhibit detail', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .get('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ─── GET /api/v1/admin/quizzes ────────────────────────────────────────────────
describe('Admin API — GET /api/v1/admin/quizzes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and list of quizzes', async () => {
    const mockQuizWithQuestions = {
      ...mockQuiz,
      exhibit: { name: 'Harimau Sumatra' },
      questions: [
        {
          id: 1,
          quizId: mockQuiz.id,
          questionText: 'Test?',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctOption: 'A',
          points: 10,
        }
      ]
    };
    prisma.quiz.findMany.mockResolvedValue([mockQuizWithQuestions]);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].title).toBe(mockQuiz.title);
    expect(res.body.data[0].questions[0].questionText).toBe('Test?');
    expect(prisma.quiz.findMany).toHaveBeenCalled();
  });

  it('should return 403 when visitor tries to access', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .get('/api/v1/admin/quizzes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/v1/admin/quizzes/:quiz_id ────────────────────────────────────────
describe('Admin API — GET /api/v1/admin/quizzes/:quiz_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and quiz detail when id is valid', async () => {
    const mockQuizWithQuestions = {
      ...mockQuiz,
      id: 12,
      exhibit: null,
      questions: [
        {
          id: 5,
          quizId: 12,
          questionText: 'Sebutkan?',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctOption: 'B',
          points: 10,
        }
      ]
    };
    prisma.quiz.findUnique.mockResolvedValue(mockQuizWithQuestions);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/quizzes/12')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(12);
    expect(res.body.data.questions[0].correctOption).toBe('B');
    expect(prisma.quiz.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      include: {
        exhibit: { select: { name: true } },
        questions: true,
      }
    });
  });

  it('should return 404 when quiz id does not exist', async () => {
    prisma.quiz.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/quizzes/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should return 400 when quiz id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/quizzes/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/v1/admin/exhibits/:exhibit_id ────────────────────────────────────
describe('Admin API — PUT /api/v1/admin/exhibits/:exhibit_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and updated exhibit when id is valid and update is successful', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.exhibit.findFirst.mockResolvedValue(null);
    prisma.exhibit.update.mockResolvedValue({
      ...mockExhibit,
      name: 'Harimau Sumatra Baru',
      zoneName: 'Zona Karnivora',
      description: 'Deskripsi baru',
    });

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Harimau Sumatra Baru');
    expect(prisma.exhibit.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(prisma.exhibit.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      },
      select: expect.any(Object),
    });
  });

  it('should return 409 when the new name is already registered by another exhibit', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(mockExhibit);
    prisma.exhibit.findFirst.mockResolvedValue({ id: 5, name: 'Harimau Sumatra Baru' });

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(prisma.exhibit.update).not.toHaveBeenCalled();
  });

  it('should return 404 when exhibit id does not exist', async () => {
    prisma.exhibit.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/exhibits/999')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
  });

  it('should return 400 when exhibit id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/exhibits/invalid')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to update exhibit', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .put('/api/v1/admin/exhibits/3')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Harimau Sumatra Baru',
        zoneName: 'Zona Karnivora',
        description: 'Deskripsi baru',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ─── DELETE /api/v1/admin/content/:id ──────────────────────────────────────────
describe('Admin API — DELETE /api/v1/admin/content/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and success message when id is valid and deleted successfully', async () => {
    prisma.learningPathContent.findUnique.mockResolvedValue(mockContent);
    prisma.learningPathContent.delete.mockResolvedValue(mockContent);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/content/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Materi edukasi berhasil dihapus');
    expect(prisma.learningPathContent.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.learningPathContent.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should return 404 when content id does not exist', async () => {
    prisma.learningPathContent.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/content/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTENT_NOT_FOUND');
    expect(prisma.learningPathContent.delete).not.toHaveBeenCalled();
  });

  it('should return 400 when id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/content/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to delete content', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .delete('/api/v1/admin/content/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ─── DELETE /api/v1/admin/media/:id ────────────────────────────────────────────
describe('Admin API — DELETE /api/v1/admin/media/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and success message when id is valid and deleted successfully', async () => {
    prisma.exhibitMedia.findUnique.mockResolvedValue(mockMedia);
    prisma.exhibitMedia.delete.mockResolvedValue(mockMedia);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/media/7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Media berhasil dihapus');
    expect(prisma.exhibitMedia.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(prisma.exhibitMedia.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('should return 404 when media id does not exist', async () => {
    prisma.exhibitMedia.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/media/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('MEDIA_NOT_FOUND');
    expect(prisma.exhibitMedia.delete).not.toHaveBeenCalled();
  });

  it('should return 400 when id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/media/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to delete media', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .delete('/api/v1/admin/media/7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ─── PUT /api/v1/admin/quizzes/:quiz_id ────────────────────────────────────────────
describe('Admin API — PUT /api/v1/admin/quizzes/:quiz_id', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(async (cb) => {
      return cb({
        quiz: {
          update: jest.fn().mockResolvedValue(mockQuiz),
        },
        question: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      });
    });
  });

  it('should return 200 and updated data when quiz update is successful', async () => {
    prisma.quiz.findUnique.mockResolvedValue(mockQuiz);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/quizzes/10')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Quiz Title',
        quizType: 'POST_ZOO',
        scope: 'GLOBAL',
        ageCategory: 'TEEN',
        questions: [
          {
            questionText: 'Updated question?',
            optionA: 'Opt A',
            optionB: 'Opt B',
            optionC: 'Opt C',
            optionD: 'Opt D',
            correctOption: 'A',
            points: 10,
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quizId).toBe(mockQuiz.id);
    expect(res.body.data.totalQuestionsUpdated).toBe(1);
    expect(prisma.quiz.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should return 404 when quiz id does not exist', async () => {
    prisma.quiz.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/quizzes/999')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Quiz Title',
        quizType: 'POST_ZOO',
        scope: 'GLOBAL',
        ageCategory: 'TEEN',
        questions: [
          {
            questionText: 'Updated question?',
            optionA: 'Opt A',
            optionB: 'Opt B',
            optionC: 'Opt C',
            optionD: 'Opt D',
            correctOption: 'A',
            points: 10,
          }
        ]
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('QUIZ_NOT_FOUND');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should return 400 when quiz_id parameter is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .put('/api/v1/admin/quizzes/invalid')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Quiz Title',
        quizType: 'POST_ZOO',
        scope: 'GLOBAL',
        ageCategory: 'TEEN',
        questions: [
          {
            questionText: 'Updated question?',
            optionA: 'Opt A',
            optionB: 'Opt B',
            optionC: 'Opt C',
            optionD: 'Opt D',
            correctOption: 'A',
            points: 10,
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to update quiz', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .put('/api/v1/admin/quizzes/10')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Quiz Title',
        quizType: 'POST_ZOO',
        scope: 'GLOBAL',
        ageCategory: 'TEEN',
        questions: [
          {
            questionText: 'Updated question?',
            optionA: 'Opt A',
            optionB: 'Opt B',
            optionC: 'Opt C',
            optionD: 'Opt D',
            correctOption: 'A',
            points: 10,
          }
        ]
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('Admin API — DELETE /api/v1/admin/quizzes/:quiz_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and success message when quiz_id is valid and deleted successfully', async () => {
    prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
    prisma.quiz.delete.mockResolvedValue(mockQuiz);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/quizzes/10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Kuis berhasil dihapus');
    expect(prisma.quiz.findUnique).toHaveBeenCalledWith({ where: { id: 10 }, select: { id: true } });
    expect(prisma.quiz.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it('should return 404 when quiz id does not exist', async () => {
    prisma.quiz.findUnique.mockResolvedValue(null);

    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/quizzes/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('QUIZ_NOT_FOUND');
    expect(prisma.quiz.delete).not.toHaveBeenCalled();
  });

  it('should return 400 when quiz_id is invalid', async () => {
    const token = generateTestToken(1, 'ADMIN');
    const res = await request(app)
      .delete('/api/v1/admin/quizzes/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when visitor tries to delete quiz', async () => {
    const token = generateTestToken(1, 'VISITOR');
    const res = await request(app)
      .delete('/api/v1/admin/quizzes/10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});


