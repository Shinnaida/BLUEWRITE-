const pool = require('../config/db');
const env = require('../config/env');
const { comparePassword, hashPassword, validatePassword } = require('../utils/password');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const DUMMY_PASSWORD_HASH = '$2b$12$JTGu4qudoDd2AddPuubqvuewkKxPiEyY3M69Pe8K5M0hZfiewIQ26';
const normalizeIp = (value) => String(value || '').replace(/^::ffff:/, '');

const SELECT_SAFE_USER = `
  SELECT u.id, u.username, u.password_hash, u.role, u.is_active,
         u.must_change_password, u.account_locked, u.security_review_required,
         u.failed_login_attempts, u.locked_until, u.last_login_at, u.last_login_ip,
         u.password_changed_at,
         o.id officer_id, o.badge_number, o.first_name, o.last_name,
         o.rank, o.unit, o.email officer_email, o.status officer_status
  FROM users u
  LEFT JOIN officers o ON o.user_id = u.id
`;

function toSafeUser(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
    accountLocked: Boolean(row.account_locked),
    securityReviewRequired: Boolean(row.security_review_required),
    lastLoginAt: row.last_login_at || null,
    lastLoginIp: row.last_login_ip || null,
    passwordChangedAt: row.password_changed_at || null,
  };
  if (row.role === 'officer') {
    user.officer = {
      id: row.officer_id,
      badgeNumber: row.badge_number,
      badge_number: row.badge_number,
      firstName: row.first_name,
      first_name: row.first_name,
      lastName: row.last_name,
      last_name: row.last_name,
      rank: row.rank,
      unit: row.unit,
      status: row.officer_status,
    };
  }
  return user;
}

async function findByUsername(username, executor = pool, forUpdate = false) {
  const [rows] = await executor.execute(`${SELECT_SAFE_USER} WHERE LOWER(u.username) = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [String(username || '').trim().toLowerCase()]);
  return rows[0] || null;
}

async function findById(id, executor = pool, forUpdate = false) {
  const [rows] = await executor.execute(`${SELECT_SAFE_USER} WHERE u.id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}

async function findActiveById(id) {
  const row = await findById(id);
  if (!row || !row.is_active) return null;
  if (row.role === 'officer' && (!row.officer_id || row.officer_status !== 'Active' || row.account_locked)) return null;
  return row;
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const progressiveDelay = (attempts) => attempts >= 4 ? env.security.progressiveDelayFourthMs : attempts >= 3 ? env.security.progressiveDelayThirdMs : 0;

async function authenticate(username, password, { ipAddress = null } = {}) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const row = await findByUsername(username, db, true);
    if (!row) {
      await comparePassword(password, DUMMY_PASSWORD_HASH);
      await db.rollback();
      return { error: 'INVALID_CREDENTIALS', userId: null, accountLocked: false };
    }
    if (row.role === 'officer' && row.account_locked) {
      await db.rollback();
      return { error: 'OFFICER_LOCKED', userId: row.id, accountLocked: true, newlyLocked: false, attemptCount: Number(row.failed_login_attempts || 0) };
    }
    if (row.role === 'admin' && row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      await db.rollback();
      return { error: 'ADMIN_TEMPORARILY_LOCKED', userId: row.id, accountLocked: true, newlyLocked: false, attemptCount: Number(row.failed_login_attempts || 0) };
    }
    const adminLockExpired = row.role === 'admin' && Boolean(row.locked_until);
    if (adminLockExpired) await db.execute('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=?', [row.id]);
    const passwordMatches = row.password_hash
      ? await comparePassword(password, row.password_hash)
      : await comparePassword(password, DUMMY_PASSWORD_HASH).then(() => false);
    const active = Boolean(row.is_active) && (row.role !== 'officer' || (row.officer_id && row.officer_status === 'Active'));
    if (!passwordMatches || !active) {
      if (active) {
        const attempts = (adminLockExpired ? 0 : Number(row.failed_login_attempts || 0)) + 1;
        const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
        const officerLock = shouldLock && row.role === 'officer';
        const adminLock = shouldLock && row.role === 'admin';
        await db.execute('UPDATE users SET failed_login_attempts=?, account_locked=?, locked_until=?, security_review_required=IF(?,TRUE,security_review_required) WHERE id=?', [shouldLock ? MAX_FAILED_ATTEMPTS : attempts, officerLock, adminLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null, adminLock, row.id]);
        if (officerLock) await db.execute("DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))=?", [String(row.id)]);
        await db.commit();
        const wait = progressiveDelay(attempts);
        if (wait) await delay(wait);
        return { error: officerLock ? 'OFFICER_LOCKED' : adminLock ? 'ADMIN_TEMPORARILY_LOCKED' : 'INVALID_CREDENTIALS', userId: row.id, role: row.role, accountLocked: shouldLock, newlyLocked: shouldLock, attemptCount: Math.min(attempts, MAX_FAILED_ATTEMPTS) };
      }
      await db.rollback();
      return { error: 'INVALID_CREDENTIALS', userId: row.id, role: row.role, accountLocked: false, inactive: true, attemptCount: Number(row.failed_login_attempts || 0) };
    }
    if (row.role === 'admin' && env.security.adminAllowedIps.length && !env.security.adminAllowedIps.map(normalizeIp).includes(normalizeIp(ipAddress))) {
      await db.rollback();
      return { error: 'ADMIN_IP_NOT_ALLOWED', userId: row.id, role: row.role, accountLocked: false, attemptCount: Number(row.failed_login_attempts || 0) };
    }
    const previousLogin = { lastLoginAt: row.last_login_at || null, lastLoginIp: row.last_login_ip || null };
    if (row.role === 'officer') await db.execute('UPDATE users SET failed_login_attempts=0,account_locked=FALSE,locked_until=NULL WHERE id=?',[row.id]);
    else await db.execute('UPDATE users SET failed_login_attempts=0,account_locked=FALSE,locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,last_login_ip=? WHERE id=?',[ipAddress,row.id]);
    await db.commit();
    return { user: toSafeUser(await findById(row.id)), userId: row.id, officerEmail: row.officer_email, adminLockExpired, previousLogin };
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

async function completeOfficerLogin(userId, ipAddress) {
  const row = await findActiveById(userId);
  if (!row || row.role !== 'officer') return null;
  await pool.execute('UPDATE users SET last_login_at=CURRENT_TIMESTAMP,last_login_ip=? WHERE id=?',[ipAddress,userId]);
  return toSafeUser(await findById(userId));
}

async function getPendingOfficer(userId) {
  const row = await findActiveById(userId);
  if (!row || row.role !== 'officer') return null;
  return { user: toSafeUser(row), email: row.officer_email };
}

async function getSecurityReview(userId) {
  const user = await findById(userId);
  if (!user || user.role !== 'admin' || !user.security_review_required) return null;
  const [attempts] = await pool.execute(
    "SELECT created_at timestamp,ip_address sourceIp,action FROM activity_logs WHERE actor_user_id=? AND action IN ('LOGIN_FAILED','ACCOUNT_LOCKED','LOGIN_THROTTLED') AND created_at >= DATE_SUB(NOW(),INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT 20",
    [userId]
  );
  return { required: true, lastSuccessfulLoginAt: user.last_login_at, lastSuccessfulLoginIp: user.last_login_ip, attempts };
}

async function completeSecurityReview(userId, decision) {
  const requirePasswordChange = decision === 'unrecognized';
  const [result] = await pool.execute('UPDATE users SET security_review_required=FALSE, must_change_password=IF(?,TRUE,must_change_password) WHERE id=? AND role=\'admin\'', [requirePasswordChange, userId]);
  if (!result.affectedRows) return null;
  return toSafeUser(await findById(userId));
}

async function changePassword(userId, currentPassword, newPassword) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const row = await findById(userId, db, true);
    if (!row || !row.password_hash || !(await comparePassword(currentPassword, row.password_hash))) {
      await db.rollback();
      return { error: 'CURRENT_PASSWORD_INVALID' };
    }
    if (await comparePassword(newPassword, row.password_hash)) {
      await db.rollback();
      return { error: 'PASSWORD_REUSED' };
    }
    const policy = validatePassword(newPassword, { username: row.username, badgeNumber: row.badge_number, minimumLength: row.role === 'admin' ? 16 : 12 });
    if (!policy.valid) {
      await db.rollback();
      return { error: 'PASSWORD_POLICY', errors: policy.errors };
    }
    await db.execute('UPDATE users SET password_hash=?, must_change_password=FALSE, security_review_required=FALSE, failed_login_attempts=0, locked_until=NULL, password_changed_at=CURRENT_TIMESTAMP WHERE id=?', [await hashPassword(newPassword), row.id]);
    await db.commit();
    return { user: toSafeUser(await findById(row.id)) };
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

async function revokeUserSessions(userId) {
  await pool.execute(
    "DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) = ?",
    [String(userId)]
  );
}

module.exports = { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES, authenticate, completeOfficerLogin, getPendingOfficer, changePassword, getSecurityReview, completeSecurityReview, revokeUserSessions, findActiveById, findById, toSafeUser };