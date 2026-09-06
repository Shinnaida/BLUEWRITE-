const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/aiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many AI requests. Please wait before trying again.' } });

router.use(requireAuth, requireRole('officer'), aiLimiter);
router.post('/report-assist', controller.assist);
router.post('/report-assist/extract', controller.extract);
router.post('/report-assist/accepted', controller.accept);

module.exports = router;