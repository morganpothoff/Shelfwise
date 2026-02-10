import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import booksRouter from './routes/books.js';
import completedBooksRouter from './routes/completedBooks.js';
import friendsRouter from './routes/friends.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { cleanExpiredSessions } from './services/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for local development flexibility
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - must allow credentials for cookies
const corsOptions = {
  origin: isProduction
    ? process.env.CORS_ORIGIN || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true, // Allow cookies to be sent
  maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Cookie parser - must be before routes
app.use(cookieParser());

// Rate limiting - general API limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit for book scanning (external API calls)
const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 scans per minute
  message: { error: 'Too many scan requests, please wait before scanning more books' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/books/scan', scanLimiter);
app.use('/api/books/search', scanLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '100kb' }));

// Routes - auth routes are public
app.use('/api/auth', authRouter);

// Books routes require authentication
app.use('/api/books', requireAuth, booksRouter);

// Completed books routes require authentication
app.use('/api/completed-books', requireAuth, completedBooksRouter);

// Friends routes require authentication
app.use('/api/friends', requireAuth, friendsRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler - sanitize errors in production
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Don't leak error details in production
  const message = isProduction ? 'An unexpected error occurred' : err.message;

  res.status(500).json({ error: message });
});

// Clean up expired sessions periodically (every hour)
setInterval(() => {
  try {
    const cleaned = cleanExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Shelfwise server running on http://localhost:${PORT}`);
  if (!isProduction) {
    console.log('Running in development mode');
  }
});
