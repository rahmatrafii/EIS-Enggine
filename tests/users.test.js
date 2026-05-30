/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// MOCK DI AWAL SEBELUM IMPORTS LAINNYA
jest.unstable_mockModule('../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../src/utils/emailSender.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'mocked-email-id' }),
}));

// DYNAMIC IMPORTS AGAR MOCK BEKERJA
const prisma = (await import('../src/config/prisma.js')).default;
const emailSender = await import('../src/utils/emailSender.js');
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../src/app.js')).default;

// ─── Helper ────────────────────────────────────────────────────────────────────
const generateTestToken = (userId, role = 'VISITOR') =>
  jwt.sign({ userId, ageCategory: 'ADULT', role }, process.env.JWT_SECRET);

// ─── POST /api/v1/users/register ──────────────────────────────────────────────
describe('Users API — POST /api/v1/users/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 and user data when registration is successful', async () => {
    prisma.user.findUnique.mockResolvedValue(null); // email belum terdaftar
    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Budi Santoso',
      email: 'rahmatrafiindrayani@gmail.com',
      age: 25,
      ageCategory: 'ADULT',
      createdAt: new Date(),
    });

    const res = await request(app).post('/api/v1/users/register').send({
      name: 'Budi Santoso',
      email: 'rahmatrafiindrayani@gmail.com',
      age: 25,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('rahmatrafiindrayani@gmail.com');
    expect(res.body.data.ageCategory).toBe('ADULT');
  });

  it('should return 409 when email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'rahmatrafiindrayani@gmail.com' });

    const res = await request(app).post('/api/v1/users/register').send({
      name: 'Budi Santoso',
      email: 'rahmatrafiindrayani@gmail.com',
      age: 25,
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('should return 400 when age is below minimum (< 5)', async () => {
    const res = await request(app).post('/api/v1/users/register').send({
      name: 'Anak Kecil',
      email: 'anak@test.com',
      age: 3,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/users/register').send({
      email: 'tanpanama@test.com',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ─── POST /api/v1/users/request-otp ───────────────────────────────────────────
describe('Users API — POST /api/v1/users/request-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and send OTP when email is registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'rahmatrafiindrayani@gmail.com' });
    prisma.user.update.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/v1/users/request-otp')
      .send({ email: 'rahmatrafiindrayani@gmail.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(emailSender.sendEmail).toHaveBeenCalled();
  });

  it('should return 404 when email is not registered', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/users/request-otp')
      .send({ email: 'tidakada@test.com' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('should return 400 when email field is missing or invalid', async () => {
    const res = await request(app).post('/api/v1/users/request-otp').send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ─── POST /api/v1/users/verify-otp ────────────────────────────────────────────
describe('Users API — POST /api/v1/users/verify-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and a JWT token when OTP is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Budi',
      email: 'rahmatrafiindrayani@gmail.com',
      role: 'VISITOR',
      ageCategory: 'ADULT',
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // belum expired
    });
    prisma.user.update.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'rahmatrafiindrayani@gmail.com', otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('rahmatrafiindrayani@gmail.com');
  });

  it('should return 400 when OTP code is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'rahmatrafiindrayani@gmail.com',
      role: 'VISITOR',
      ageCategory: 'ADULT',
      otpCode: '999999',
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'rahmatrafiindrayani@gmail.com', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_INVALID');
  });

  it('should return 400 when OTP is expired', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'rahmatrafiindrayani@gmail.com',
      role: 'VISITOR',
      ageCategory: 'ADULT',
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() - 1 * 60 * 1000), // sudah expired 1 menit lalu
    });

    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'rahmatrafiindrayani@gmail.com', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  it('should return 400 when OTP format is invalid (not 6 digits)', async () => {
    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'rahmatrafiindrayani@gmail.com', otp: '12' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ─── GET /api/v1/users/profile ─────────────────────────────────────────────────
describe('Users API — GET /api/v1/users/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 and user profile when JWT is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Budi Santoso',
      email: 'rahmatrafiindrayani@gmail.com',
      age: 25,
      ageCategory: 'ADULT',
      role: 'VISITOR',
      createdAt: new Date(),
    });

    const token = generateTestToken(1);

    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('rahmatrafiindrayani@gmail.com');
    // Pastikan field sensitif OTP tidak ikut dalam response
    expect(res.body.data.otpCode).toBeUndefined();
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/v1/users/profile');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when JWT token is invalid or expired', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer token.palsu.invalid');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 when user from JWT payload does not exist in DB', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const token = generateTestToken(999); // ID yang tidak ada di DB

    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
