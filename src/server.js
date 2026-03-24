'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const {
  authRouter, serviceRouter, orderRouter,
  adminRouter, contactRouter, portfolioRouter, reviewRouter, notifRouter,
} = require('./routes');

const app = express();
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────
const CLIENT_URL = process.env.CLIENT_URL || '';

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin)                               return cb(null, true);
    if (origin.endsWith('.vercel.app'))        return cb(null, true);
    if (origin.startsWith('http://localhost')) return cb(null, true);
    if (CLIENT_URL) {
      const allowed = CLIENT_URL.split(',').map(s => s.trim());
      if (allowed.includes(origin))            return cb(null, true);
    }
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'x-uploadthing-version', 'x-uploadthing-package',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight barcha routelarda

// ─── SECURITY & LOGGING ───────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── STATIC ───────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '7d' }));

// ─── RATE LIMITING ────────────────────────────────────────
const limiter     = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50,  standardHeaders: true, legacyHeaders: false });

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ─── UPLOADTHING (optional) ───────────────────────────────
// Agar paket install bo'lmagan bo'lsa ham server ishlaydi
try {
  const { createRouteHandler } = require('uploadthing/express');
  const { ourFileRouter }      = require('./lib/uploadthing');
  app.use(
    '/api/uploadthing',
    createRouteHandler({
      router: ourFileRouter,
      config: {
        uploadthingSecret: process.env.UPLOADTHING_SECRET || '',
        uploadthingId:     process.env.UPLOADTHING_APP_ID || '',
      },
    })
  );
  console.log('   Uploadthing: ✅ enabled');
} catch (e) {
  console.warn('   Uploadthing: ⚠️  not available —', e.message);
}

// ─── ROUTES ───────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/services',      serviceRouter);
app.use('/api/orders',        orderRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/contact',       contactRouter);
app.use('/api/portfolio',     portfolioRouter);
app.use('/api/reviews',       reviewRouter);
app.use('/api/notifications', notifRouter);

// ─── HEALTH ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success:   true,
    message:   'MarryMe API is running 💍',
    env:       process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── ERROR HANDLER ────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  const status = err.status || 500;
  // CORS xatosi bo'lsa ham JSON qaytaramiz
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── START ────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n💍 MarryMe API → http://0.0.0.0:' + PORT);
  console.log('   NODE_ENV  : ' + (process.env.NODE_ENV || 'development'));
  console.log('   JWT_SECRET: ' + (process.env.JWT_SECRET ? '✅ set' : '❌ MISSING'));
  console.log('   DATABASE  : ' + (process.env.DATABASE_URL ? '✅ set' : '❌ MISSING'));
  console.log('   UPLOADTHING: ' + (process.env.UPLOADTHING_SECRET ? '✅ set' : '⚠️  not set') + '\n');
});

module.exports = app;
