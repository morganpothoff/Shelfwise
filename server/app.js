/**
 * Express app configuration - exported for testing without starting the server
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import booksRouter from './routes/books.js';
import completedBooksRouter from './routes/completedBooks.js';
import friendsRouter from './routes/friends.js';
import borrowRouter from './routes/borrow.js';
import pickANumberRouter from './routes/pickANumber.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const corsOptions = {
  origin: isProduction
    ? process.env.CORS_ORIGIN || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many scan requests, please wait before scanning more books' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/books/scan', scanLimiter);
app.use('/api/books/search', scanLimiter);
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRouter);
app.use('/api/books', requireAuth, booksRouter);
app.use('/api/completed-books', requireAuth, completedBooksRouter);
app.use('/api/friends', requireAuth, friendsRouter);
app.use('/api/borrow', requireAuth, borrowRouter);
app.use('/api/pick-a-number', requireAuth, pickANumberRouter);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const message = isProduction ? 'An unexpected error occurred' : err.message;
  res.status(500).json({ error: message });
});

export { app };
