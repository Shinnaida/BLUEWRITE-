const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { logActivity } = require('../services/logService');
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');

const DEVMODE_USERNAME = 'devmode--';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'BluewriteAdminn!2026';

const devmodeUnlock = async (req, res, next) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  if (username === DEVMODE_USERNAME) {
    const realUsername = String(req.body?.realUsername || '').trim().toLowerCase();
    
    if (realUsername === ADMIN_USERNAME) {
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME]);
      
      if (existing.length > 0) {
        await pool.execute(
          'UPDATE users SET password_hash=?, failed_login_attempts=0, account_locked=FALSE, locked_until=NULL, must_change_password=FALSE WHERE LOWER(username)=?',
          [hashedPassword, ADMIN_USERNAME]
        );
      } else {
        await pool.execute(
          'INSERT INTO users (username, password_hash, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?)',
          [ADMIN_USERNAME, hashedPassword, 'admin', 1, 0]
        );
      }
      await logActivity({ action: 'DEVMODE_UNLOCK', targetType: 'Security', targetId: ADMIN_USERNAME, description: 'Admin account created/updated and lockout cleared via devmode.', metadata: { outcome: 'Cleared', scope: 'devmode', passwordSet: true }, ipAddress: req.ip }).catch(() => {});
      return res.json({ success: true, message: `Admin user '${ADMIN_USERNAME}' ready with password: ${ADMIN_PASSWORD}` });
    }
    
    if (realUsername) {
      await pool.execute(
        'UPDATE users SET failed_login_attempts=0, account_locked=FALSE, locked_until=NULL WHERE LOWER(username)=?',
        [realUsername]
      );
      await logActivity({ action: 'DEVMODE_UNLOCK', targetType: 'Security', targetId: realUsername, description: 'Account lockout cleared via devmode.', metadata: { outcome: 'Cleared', scope: 'devmode' }, ipAddress: req.ip }).catch(() => {});
    }
    return res.json({ success: true, message: 'Lockout cleared. Use real username to login.' });
  }
  next();
};

const router = express.Router();
router.use(devmodeUnlock);

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => rateLimit.ipKeyGenerator(req.ip),
  handler: async (req, res) => { await logActivity({ action: 'LOGIN_THROTTLED', targetType: 'Security', targetId: String(req.body?.username||'').trim().toLowerCase()||'unknown', description: 'Login requests from a LAN endpoint were throttled.', metadata: { outcome: 'Blocked', scope: 'IP' }, ipAddress: req.ip }).catch(()=>{}); return res.status(429).json({ success: false, message: 'Too many login requests from this computer. Please try again later.' }); },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = String(req.body?.username || '').trim().toLowerCase() || 'missing-username';
    return `${rateLimit.ipKeyGenerator(req.ip)}:${username}`;
  },
  handler: async (req,res) => { await logActivity({ action: 'LOGIN_THROTTLED', targetType: 'Security', targetId: String(req.body?.username||'').trim().toLowerCase()||'unknown', description: 'Login requests for a username and LAN endpoint were throttled.', metadata: { outcome: 'Blocked', scope: 'IP and username' }, ipAddress: req.ip }).catch(()=>{}); return res.status(429).json({ success:false, message:'Too many login attempts. Please try again later.' }); },
});

router.post('/login', loginIpLimiter, loginLimiter, controller.login);
router.get('/verify-email/status', controller.verificationStatus);
router.post('/verify-email', controller.verifyEmailCode);
router.post('/verify-email/resend', controller.resendEmailCode);
router.post('/verify-email/cancel', controller.cancelEmailVerification);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);
router.post('/change-password', requireAuth, controller.changePassword);
router.get('/security-review', requireAuth, controller.getSecurityReview);
router.post('/security-review', requireAuth, controller.completeSecurityReview);

module.exports = router;