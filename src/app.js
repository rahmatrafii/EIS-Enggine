import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware.js';

// ─── Route Imports ─────────────────────────────────────────────────────────────
import usersRoutes from './routes/users.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import quizzesRoutes from './routes/quizzes.routes.js';
import trackRoutes from './routes/track.routes.js';
import retentionRoutes from './routes/retention.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Prefix Routing Registration ──────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/sessions`, sessionsRoutes);
app.use(`${API_PREFIX}/quizzes`, quizzesRoutes);
app.use(`${API_PREFIX}/track`, trackRoutes);
app.use(`${API_PREFIX}/retention`, retentionRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ─── Central Error Handler (WAJIB paling akhir) ───────────────────────────────
app.use(errorHandler);

export default app;
