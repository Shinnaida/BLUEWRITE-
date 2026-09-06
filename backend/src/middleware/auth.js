const authService = require('../services/authService');
const { logActivity } = require('../services/logService');
const { error } = require('../utils/response');
const env = require('../config/env');

async function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) return error(res, 'Authentication required.', 401);
  try {
    const now = Date.now();
    const authenticatedAt = Number(req.session.authenticatedAt || now);
    const lastActivityAt = Number(req.session.lastActivityAt || authenticatedAt);
    if (now - authenticatedAt > env.session.absoluteMaxAgeMs) {
      req.session.destroy(() => {});
      return error(res, 'Your session has expired. Please sign in again.', 401);
    }
    if (!req.session.authenticatedAt) req.session.authenticatedAt = authenticatedAt;
    const row = await authService.findActiveById(userId);
    if (!row) {
      req.session.destroy(() => {});
      return error(res, 'Your session is no longer authorized.', 401);
    }
    req.user = authService.toSafeUser(row);
    if (req.user.role === 'admin' && now - lastActivityAt > env.session.adminIdleMs) {
      req.session.destroy(() => {});
      return error(res, 'Your session has expired. Please sign in again.', 401);
    }
    req.session.lastActivityAt = now;
    if (req.user.role === 'admin') req.session.cookie.maxAge = env.session.adminIdleMs;
    return next();
  } catch {
    return error(res, 'Unable to verify authentication.', 500);
  }
}

function requirePasswordChangeComplete(req, res, next) {
  if (!req.user?.mustChangePassword) return next();
  return error(res, 'You must change your temporary password before accessing this resource.', 403);
}

const requireRole = (...roles) => async (req, res, next) => {
  if (req.user?.securityReviewRequired) return error(res, 'Complete the required security review before accessing this resource.', 403);
  if (req.user?.mustChangePassword) return error(res, 'You must change your temporary password before accessing this resource.', 403);
  if (roles.includes(req.user?.role)) return next();
  await logActivity({ actorUserId: req.user?.id || null, action: 'UNAUTHORIZED_ACCESS_ATTEMPT', targetType: 'Security', targetId: req.originalUrl, description: 'A user attempted to access a route without the required role.', metadata: { method: req.method }, ipAddress: req.ip }).catch(() => {});
  return error(res, 'You do not have permission to access this resource.', 403);
};

module.exports = { requireAuth, requirePasswordChangeComplete, requireRole };