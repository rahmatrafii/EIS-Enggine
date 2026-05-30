import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.RETENTION_TOKEN_SECRET = 'test_retention_secret';
process.env.CRON_SECRET_KEY = 'test_cron_secret';

beforeEach(() => {
  jest.clearAllMocks();
});
