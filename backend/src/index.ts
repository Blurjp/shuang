import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { checkDatabaseConnection, disconnectDatabase, initializeDatabase } from './models/database';
import { requestLogger, errorLogger } from './middleware/logging';
import { logger } from './utils/logger';

// Load environment variables FIRST before importing routes
dotenv.config();

// Import routes (after dotenv is loaded)
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import contentRoutes from './routes/content';
import feedbackRoutes from './routes/feedback';
import photoRoutes from './routes/photos';
import subscriptionRoutes from './routes/subscription';
import storyArcRoutes from './routes/storyArcs';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'capacitor://localhost', // For iOS Capacitor
      'http://localhost', // For iOS simulator
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/arcs', storyArcRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error logger middleware (must be before the error handler)
app.use(errorLogger);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS not allowed' });
  }

  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: err.message,
      retryAfter: err.resetTime
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed. The server will start but may not function correctly.');
    } else {
      logger.info('Database connected successfully');

      // Initialize database tables
      await initializeDatabase();
      logger.info('Database tables initialized');
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(``);
      logger.info(`========================================`);
      logger.info(`  Daily Protagonist Backend API`);
      logger.info(`========================================`);
      logger.info(`  Server running on port ${PORT}`);
      logger.info(`  Health check: http://localhost:${PORT}/health`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`========================================`);
      logger.info(``);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
