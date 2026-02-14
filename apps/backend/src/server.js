const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { loadEnv } = require('./lib/env');

loadEnv();

// Ensure test env when running under Jest
if (process.env.JEST_WORKER_ID !== undefined) {
  process.env.NODE_ENV = 'test';
}

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const prisma = require('./lib/prisma');
const app = express();
const PORT = process.env.PORT || 5000;
let appVersion = '1.0.0';
let servesFrontendBundle = false;

try {
  appVersion = require(path.join(__dirname, '../package.json')).version || appVersion;
} catch {
  // Keep fallback version when package.json is not available.
}

// Trust proxy in production (for rate limiting and IP address)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) {
      return callback(null, true);
    }

    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Always allow localhost/127.0.0.1 origins for local preview and mobile emulator testing.
    if (localDevOriginPattern.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS before rate limiting so even error responses include CORS headers.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Rate limiting
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 600 : 1000);
const loopbackIpPattern = /^::1$|^::ffff:127\.0\.0\.1$|^127\.0\.0\.1$/;

const isLocalPreviewRequest = (req) => {
  const hostname = String(req.hostname || '').toLowerCase();
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || loopbackIpPattern.test(ip);
};

// Skip rate limiting in test env, CORS preflight, and localhost preview traffic.
const skipRateLimit = (req) =>
  process.env.NODE_ENV === 'test' ||
  req.method === 'OPTIONS' ||
  isLocalPreviewRequest(req);

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 20, // Keep auth protection while avoiding false positives during normal usage
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  skip: skipRateLimit,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const goalsRoutes = require('./routes/goals');
const recurringRoutes = require('./routes/recurring');
const { processDueRecurring } = require('./lib/recurring');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/recurring', recurringRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const healthCheck = {
      message: 'Expense Tracker API is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: appVersion,
      database: 'disconnected',
      frontend: 'unavailable',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
      }
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthCheck.database = 'connected';
    } catch (dbError) {
      console.error('Database health check failed:', dbError.message);
      healthCheck.database = 'disconnected';
      healthCheck.status = 'unhealthy';
    }

    // Check if frontend files are available (in production/Docker)
    if (process.env.NODE_ENV === 'production') {
      try {
        const fs = require('fs');
        const frontendIndexExists = fs.existsSync(path.join(__dirname, '../public/index.html'));
        const frontendAssetsExist = fs.existsSync(path.join(__dirname, '../public/assets'));

        if (frontendIndexExists && frontendAssetsExist) {
          healthCheck.frontend = 'available';
        } else {
          healthCheck.frontend = 'partial';
          console.warn('Frontend files partially missing');
        }
      } catch (frontendError) {
        console.error('Frontend health check failed:', frontendError.message);
        healthCheck.frontend = 'unavailable';
      }
    } else {
      healthCheck.frontend = 'development';
    }

    // Overall API health status should depend on API dependencies (DB), not bundled frontend assets.
    // Frontend may be hosted separately in production.
    if (healthCheck.database === 'connected') {
      healthCheck.status = 'healthy';
      res.status(200).json(healthCheck);
    } else {
      healthCheck.status = 'unhealthy';
      res.status(503).json(healthCheck);
    }

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      message: 'Service unavailable',
      status: 'unhealthy',
      database: 'unknown',
      frontend: 'unknown',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
      timestamp: new Date().toISOString()
    });
  }
});

// Serve static files from the React app build (in production/Docker)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const publicPath = path.join(__dirname, '../public');
  const indexHtmlPath = path.join(publicPath, 'index.html');
  const hasFrontendBundle = fs.existsSync(indexHtmlPath);

  if (hasFrontendBundle) {
    servesFrontendBundle = true;
    app.use(express.static(publicPath));

    // Catch all handler: send back React's index.html file for any non-API routes.
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      return res.sendFile(indexHtmlPath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  } else {
    console.log('Frontend bundle not found in /public. Running API-only mode.');
  }
}

if (process.env.NODE_ENV === 'production' && !servesFrontendBundle) {
  app.get('/', (_req, res) => {
    res.status(200).json({
      message: 'Expense Tracker API is running',
      health: '/api/health'
    });
  });
}

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid input data'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for API routes only (in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

// Only start the server if this file is run directly (not imported for tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
      console.log('Serving static files from public directory');
    }
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  });

  if (process.env.AUTO_PROCESS_RECURRING === 'true') {
    const intervalMinutes = Number(process.env.PROCESS_RECURRING_INTERVAL_MINUTES) || 60;
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    setInterval(() => {
      processDueRecurring(prisma)
        .catch((error) => {
          console.error('Recurring processing failed:', error);
        });
    }, intervalMs);
  }

  // Graceful shutdown handling
  let isShuttingDown = false;
  let forceShutdownTimer = null;

  const finalizeShutdown = async (exitCode = 0) => {
    try {
      await prisma.$disconnect();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error while disconnecting database:', error);
      exitCode = 1;
    } finally {
      if (forceShutdownTimer) {
        clearTimeout(forceShutdownTimer);
      }
      console.log('Graceful shutdown completed');
      process.exit(exitCode);
    }
  };

  const gracefulShutdown = (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Force shutdown after 30 seconds
    forceShutdownTimer = setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);

    if (!server.listening) {
      finalizeShutdown(0);
      return;
    }

    // Stop accepting new connections
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        finalizeShutdown(1);
        return;
      }

      console.log('HTTP server closed');
      finalizeShutdown(0);
    });
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

module.exports = app;
