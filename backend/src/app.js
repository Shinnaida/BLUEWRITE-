// BLUEWRITE — Express Application
// Configures the Express app, middleware, routes, and error handlers.

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const env = require('./config/env');
const pool = require('./config/db');
const { success } = require('./utils/response');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const aiRoutes = require('./routes/aiRoutes');
const officerRoutes = require('./routes/officerRoutes');
const reportRoutes = require('./routes/reportRoutes');
const logRoutes = require('./routes/logRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const backupRoutes = require('./routes/backupRoutes');

const app = express();
if (!env.session.secret) throw new Error('SESSION_SECRET is required.');
const sessionCookieOptions = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'strict', maxAge: env.session.maxAgeMs, path: '/' };
const sessionStore = new MySQLStore({ createDatabaseTable: true, schema: { tableName: 'auth_sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } } }, pool);
app.set('sessionCookieName', env.session.name);
app.set('sessionCookieOptions', sessionCookieOptions);
app.set('adminSessionIdleMs', env.session.adminIdleMs);

// Built-in JSON body parser
app.use(helmet());
app.use(express.json());
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175'];
app.use((req,res,next)=>{const origin=req.get('Origin');if(allowedOrigins.includes(origin)){res.set('Access-Control-Allow-Origin',origin);res.set('Access-Control-Allow-Credentials','true')}res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.use((req,res,next)=>{const origin=req.get('Origin');const unsafe=!['GET','HEAD','OPTIONS'].includes(req.method);if(unsafe&&origin&&!allowedOrigins.includes(origin))return res.status(403).json({success:false,message:'Request origin is not allowed.'});return next();});
app.use(session({ name: env.session.name, secret: env.session.secret, store: sessionStore, resave: false, saveUninitialized: false, rolling: true, cookie: sessionCookieOptions }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let database = 'disconnected';
  try {
    await pool.query('SELECT 1 AS db_test');
    database = 'connected';
  } catch (dbError) {
    // Keep credentials and raw database errors out of the HTTP response.
  }
  const localOnly = process.env.OLLAMA_ONLY === 'true';
  const aiProvider = localOnly ? 'Ollama (local)' : 'Google AI Studio';
  const aiConfigured = localOnly ? true : Boolean(env.googleAI.apiKey);
  return success(res, { status: 'ok', database, aiProvider, ai: aiConfigured ? 'configured' : 'not_configured', timestamp: new Date().toISOString(), environment: env.nodeEnv }, 'Service health checked', 200);
});

// Authenticated Officer AI writing-assistance routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity-logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/backups', backupRoutes);

// Global 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;