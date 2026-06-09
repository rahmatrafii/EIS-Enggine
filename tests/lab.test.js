/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// MOCK DI AWAL SEBELUM IMPORTS LAINNYA
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: jest.fn(),
    },
    exhibit: {
      findUnique: jest.fn(),
    },
    interactiveLabGame: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const prisma = (await import('../src/config/prisma.js')).default;
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

// ─── Helper ────────────────────────────────────────────────────────────────────
const generateTestToken = (userId, role = 'VISITOR', ageCategory = 'ADULT') =>
  jwt.sign({ userId, ageCategory, role }, process.env.JWT_SECRET);

const mockGame = {
  id: 1,
  exhibitId: 3,
  ageCategory: 'ADULT',
  gameType: 'PICTURE_CHOICE',
  title: 'Identifikasi Satwa',
  gameConfig: {
    question: 'Mana yang merupakan Harimau Sumatera?',
    options: [
      { id: '1', imageUrl: 'https://test.com/tiger.jpg', label: 'Harimau', isCorrect: true },
      { id: '2', imageUrl: 'https://test.com/lion.jpg', label: 'Singa', isCorrect: false }
    ]
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validDragDropBody = {
  exhibitId: 3,
  ageCategory: 'ADULT',
  gameType: 'DRAG_DROP',
  title: 'Klasifikasi Makanan',
  gameConfig: {
    target: {
      imageUrl: 'https://test.com/carnivore.jpg',
      label: 'Karnivora'
    },
    items: [
      { id: '1', imageUrl: 'https://test.com/meat.jpg', label: 'Daging', isCorrect: true },
      { id: '2', imageUrl: 'https://test.com/grass.jpg', label: 'Rumput', isCorrect: false }
    ]
  }
};

const validMatchingBody = {
  exhibitId: 3,
  ageCategory: 'ADULT',
  gameType: 'MATCHING',
  title: 'Pasangan Satwa',
  gameConfig: {
    pairs: [
      {
        id: '1',
        threat: 'Penebangan liar',
        solution: 'Reboisasi'
      }
    ]
  }
};

const validPictureChoiceBody = {
  exhibitId: 3,
  ageCategory: 'ADULT',
  gameType: 'PICTURE_CHOICE',
  title: 'Identifikasi Satwa',
  gameConfig: {
    question: 'Mana yang merupakan Harimau?',
    options: [
      { id: '1', imageUrl: 'https://test.com/tiger.jpg', label: 'Harimau', isCorrect: true },
      { id: '2', imageUrl: 'https://test.com/lion.jpg', label: 'Singa', isCorrect: false }
    ]
  }
};

describe('Interactive Lab Games API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // ADMIN API - POST /api/v1/admin/lab-games
  // ==========================================
  describe('POST /api/v1/admin/lab-games', () => {
    it('should create a DRAG_DROP game when payload is valid and user is admin', async () => {
      prisma.exhibit.findUnique.mockResolvedValue({ id: 3, isActive: true });
      prisma.interactiveLabGame.create.mockResolvedValue({ ...mockGame, gameType: 'DRAG_DROP', gameConfig: validDragDropBody.gameConfig });

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validDragDropBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gameType).toBe('DRAG_DROP');
    });

    it('should create a MATCHING game when payload is valid and user is admin', async () => {
      prisma.exhibit.findUnique.mockResolvedValue({ id: 3, isActive: true });
      prisma.interactiveLabGame.create.mockResolvedValue({ ...mockGame, gameType: 'MATCHING', gameConfig: validMatchingBody.gameConfig });

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validMatchingBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gameType).toBe('MATCHING');
    });

    it('should create a PICTURE_CHOICE game when payload is valid and user is admin', async () => {
      prisma.exhibit.findUnique.mockResolvedValue({ id: 3, isActive: true });
      prisma.interactiveLabGame.create.mockResolvedValue(mockGame);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validPictureChoiceBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gameType).toBe('PICTURE_CHOICE');
    });

    it('should create a PICTURE_CHOICE game with ageCategory ALL when user is admin', async () => {
      prisma.exhibit.findUnique.mockResolvedValue({ id: 3, isActive: true });
      prisma.interactiveLabGame.create.mockResolvedValue({ ...mockGame, ageCategory: 'ALL' });

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPictureChoiceBody, ageCategory: 'ALL' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ageCategory).toBe('ALL');
    });

    it('should fail with validation error for invalid DRAG_DROP config', async () => {
      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validDragDropBody,
          gameConfig: {
            target: { label: '' }, // empty label and missing imageUrl
            items: [] // items cannot be empty
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should fail with validation error for invalid MATCHING config', async () => {
      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validMatchingBody,
          gameConfig: {
            pairs: 'not-an-array' // must be an array
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should fail with validation error for PICTURE_CHOICE when no correct option is selected', async () => {
      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validPictureChoiceBody,
          gameConfig: {
            question: 'Question?',
            options: [
              { id: '1', imageUrl: 'https://test.com/1.jpg', label: 'One', isCorrect: false },
              { id: '2', imageUrl: 'https://test.com/2.jpg', label: 'Two', isCorrect: false }
            ]
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('isCorrect');
    });

    it('should return 404 when exhibitId does not exist', async () => {
      prisma.exhibit.findUnique.mockResolvedValue(null);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validPictureChoiceBody);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    });

    it('should return 404 when exhibit is inactive', async () => {
      prisma.exhibit.findUnique.mockResolvedValue({ id: 3, isActive: false });

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validPictureChoiceBody);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('EXHIBIT_NOT_FOUND');
    });

    it('should return 403 when visitor attempts to create a game', async () => {
      const token = generateTestToken(1, 'VISITOR');
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`)
        .send(validPictureChoiceBody);

      expect(res.status).toBe(403);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/admin/lab-games')
        .send(validPictureChoiceBody);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // ADMIN API - GET /api/v1/admin/lab-games
  // ==========================================
  describe('GET /api/v1/admin/lab-games', () => {
    it('should return 200 and list of lab games', async () => {
      prisma.interactiveLabGame.findMany.mockResolvedValue([mockGame]);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .get('/api/v1/admin/lab-games')
        .query({ exhibit_id: 3 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 400 when exhibit_id query param is missing or invalid', async () => {
      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .get('/api/v1/admin/lab-games')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // ADMIN API - GET /api/v1/admin/lab-games/:game_id
  // ==========================================
  describe('GET /api/v1/admin/lab-games/:game_id', () => {
    it('should return 200 and game details', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(mockGame);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .get('/api/v1/admin/lab-games/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it('should return 404 when game not found', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(null);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .get('/api/v1/admin/lab-games/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('LAB_GAME_NOT_FOUND');
    });

    it('should return 400 when game_id is invalid', async () => {
      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .get('/api/v1/admin/lab-games/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // ADMIN API - PUT /api/v1/admin/lab-games/:game_id
  // ==========================================
  describe('PUT /api/v1/admin/lab-games/:game_id', () => {
    it('should update game config successfully', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(mockGame);
      prisma.interactiveLabGame.update.mockResolvedValue({ ...mockGame, title: 'New Game Title' });

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .put('/api/v1/admin/lab-games/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validPictureChoiceBody,
          title: 'New Game Title'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Game Title');
    });

    it('should return 404 when game to update does not exist', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(null);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .put('/api/v1/admin/lab-games/999')
        .set('Authorization', `Bearer ${token}`)
        .send(validPictureChoiceBody);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('LAB_GAME_NOT_FOUND');
    });
  });

  // ==========================================
  // ADMIN API - DELETE /api/v1/admin/lab-games/:game_id
  // ==========================================
  describe('DELETE /api/v1/admin/lab-games/:game_id', () => {
    it('should hard-delete game successfully', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(mockGame);
      prisma.interactiveLabGame.delete.mockResolvedValue(mockGame);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .delete('/api/v1/admin/lab-games/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.interactiveLabGame.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return 404 when game to delete does not exist', async () => {
      prisma.interactiveLabGame.findUnique.mockResolvedValue(null);

      const token = generateTestToken(1, 'ADMIN');
      const res = await request(app)
        .delete('/api/v1/admin/lab-games/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('LAB_GAME_NOT_FOUND');
    });
  });

  // ==========================================
  // VISITOR API - GET /api/v1/track/lab-games
  // ==========================================
  describe('GET /api/v1/track/lab-games', () => {
    it('should return matching games for visitor based on ageCategory', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, ageCategory: 'ADULT' });
      prisma.interactiveLabGame.findMany.mockResolvedValue([mockGame]);

      const token = generateTestToken(1, 'VISITOR', 'ADULT');
      const res = await request(app)
        .get('/api/v1/track/lab-games')
        .query({ exhibit_id: 3 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(prisma.interactiveLabGame.findMany).toHaveBeenCalledWith({
        where: {
          exhibitId: 3,
          ageCategory: {
            in: ['ADULT', 'ALL']
          },
          isActive: true
        },
        select: {
          id: true,
          exhibitId: true,
          ageCategory: true,
          gameType: true,
          title: true,
          gameConfig: true
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return 400 when exhibit_id is missing', async () => {
      const token = generateTestToken(1, 'VISITOR', 'ADULT');
      const res = await request(app)
        .get('/api/v1/track/lab-games')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when visitor user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const token = generateTestToken(1, 'VISITOR', 'ADULT');
      const res = await request(app)
        .get('/api/v1/track/lab-games')
        .query({ exhibit_id: 3 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });
});
