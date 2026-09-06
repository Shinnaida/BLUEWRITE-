// BLUEWRITE — Environment Configuration
// Loads and validates environment variables from .env

const dotenv = require('dotenv');

dotenv.config();
const integer = (value, fallback) => Number.isFinite(Number.parseInt(value, 10)) ? Number.parseInt(value, 10) : fallback;

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'bluewrite_db',
  },

  session: {
    secret: process.env.SESSION_SECRET || '',
    name: process.env.SESSION_COOKIE_NAME || 'bluewrite.sid',
    maxAgeMs: parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 8 * 60 * 60 * 1000,
    adminIdleMs: parseInt(process.env.ADMIN_SESSION_IDLE_MS, 10) || 60 * 60 * 1000,
    absoluteMaxAgeMs: parseInt(process.env.SESSION_ABSOLUTE_MAX_AGE_MS, 10) || 8 * 60 * 60 * 1000,
  },

  security: {
    adminAllowedIps: String(process.env.ADMIN_ALLOWED_IPS || '').split(',').map((value) => value.trim()).filter(Boolean),
    progressiveDelayThirdMs: Math.max(0, integer(process.env.LOGIN_DELAY_THIRD_MS, 2000)),
    progressiveDelayFourthMs: Math.max(0, integer(process.env.LOGIN_DELAY_FOURTH_MS, 5000)),
  },

  mail: {
    mode: process.env.MAIL_MODE || 'smtp',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: integer(process.env.SMTP_PORT, 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    appPassword: process.env.SMTP_APP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
    verificationSecret: process.env.EMAIL_VERIFICATION_SECRET || '',
    codeTtlMs: Math.max(60000, integer(process.env.EMAIL_CODE_TTL_MS, 5 * 60 * 1000)),
    resendCooldownMs: Math.max(1000, integer(process.env.EMAIL_RESEND_COOLDOWN_MS, 60 * 1000)),
    sendWindowMs: Math.max(60000, integer(process.env.EMAIL_SEND_WINDOW_MS, 15 * 60 * 1000)),
    maxSends: Math.max(1, integer(process.env.EMAIL_MAX_SENDS, 3)),
    maxAttempts: Math.max(1, integer(process.env.EMAIL_MAX_ATTEMPTS, 5)),
  },

  googleAI: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    timeoutMs: Math.min(120000, Math.max(1000, integer(process.env.GEMINI_TIMEOUT_MS, 90000))),
    maxOutputTokens: Math.min(4000, Math.max(128, integer(process.env.GEMINI_MAX_OUTPUT_TOKENS, 1200))),
    retryDelayMs: Math.min(5000, Math.max(0, integer(process.env.GEMINI_RETRY_DELAY_MS, 750))),
  },
};

module.exports = env;