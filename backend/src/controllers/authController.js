const authService = require('../services/authService');
const { logActivity } = require('../services/logService');
const loginVerificationService = require('../services/loginVerificationService');
const { success, error } = require('../utils/response');

function regenerate(req) { return new Promise((resolve, reject) => req.session.regenerate((e) => e ? reject(e) : resolve())); }
function save(req) { return new Promise((resolve, reject) => req.session.save((e) => e ? reject(e) : resolve())); }

exports.login = async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) return error(res, 'Username and password are required.', 400);
  try {
    const result = await authService.authenticate(username, password, { ipAddress: req.ip });
    if (result.error) {
      const action = result.newlyLocked ? 'ACCOUNT_LOCKED' : result.error === 'ADMIN_IP_NOT_ALLOWED' ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED';
      const description = result.newlyLocked
        ? result.role === 'officer' ? 'Officer account locked after repeated unsuccessful login attempts.' : 'Administrator account temporarily locked after repeated unsuccessful login attempts.'
        : result.error === 'OFFICER_LOCKED' ? 'Login attempt blocked because the Officer account requires Administrator unlock.'
          : result.error === 'ADMIN_TEMPORARILY_LOCKED' ? 'Administrator login attempt blocked during temporary lockout.'
            : result.error === 'ADMIN_IP_NOT_ALLOWED' ? 'Administrator login blocked from a workstation outside the configured allowlist.' : 'Login attempt failed.';
      await logActivity({ actorUserId: result.userId, action, targetType: 'Security', targetId: username.toLowerCase(), description, metadata: { outcome: 'Failure', attemptCount: result.attemptCount || null }, ipAddress: req.ip }).catch(() => {});
      if (result.error === 'OFFICER_LOCKED') return error(res, 'Unable to sign in. Contact an Administrator if you need assistance.', 423);
      if (result.error === 'ADMIN_TEMPORARILY_LOCKED') return error(res, 'Too many unsuccessful login attempts. Please try again later.', 429);
      if (result.error === 'ADMIN_IP_NOT_ALLOWED') return error(res, 'Unable to sign in from this workstation.', 403);
      return error(res, 'Invalid username or password.', 401);
    }
    if (result.user.role === 'officer') {
      const challenge = await loginVerificationService.createChallenge({ userId: result.user.id, email: result.officerEmail });
      await regenerate(req);
      req.session.pendingVerification = { userId: result.user.id, challengeId: challenge.challengeId, maskedEmail: challenge.maskedEmail, createdAt: Date.now() };
      req.session.cookie.maxAge = 10 * 60 * 1000;
      await save(req);
      await logActivity({ actorUserId: result.user.id, action: 'EMAIL_VERIFICATION_CODE_SENT', targetType: 'Security', targetId: result.user.username, description: 'Officer login verification code sent.', metadata: { outcome: 'Pending' }, ipAddress: req.ip }).catch(() => {});
      return success(res, { verificationRequired: true, maskedEmail: challenge.maskedEmail, expiresInSeconds: challenge.expiresInSeconds }, 'Verification code sent.');
    }
    await regenerate(req);
    req.session.userId = result.user.id;
    req.session.authenticatedAt = Date.now();
    req.session.lastActivityAt = Date.now();
    req.session.securityReviewRequired = Boolean(result.user.securityReviewRequired);
    req.session.securityReviewContext = result.user.securityReviewRequired ? { previousLogin: result.previousLogin } : null;
    if (result.user.role === 'admin') req.session.cookie.maxAge = req.app.get('adminSessionIdleMs');
    await save(req);
    await logActivity({ actorUserId: result.user.id, action: 'LOGIN_SUCCESS', targetType: 'Security', targetId: 'SESSION', description: `${result.user.role === 'admin' ? 'Administrator' : 'Officer'} login succeeded.`, ipAddress: req.ip }).catch(() => {});
    if (result.adminLockExpired) await logActivity({ actorUserId: result.user.id, action: 'ACCOUNT_UNLOCKED', targetType: 'Security', targetId: String(result.user.id), description: 'Administrator temporary lockout expired automatically.', metadata: { method: 'Automatic expiry' }, ipAddress: req.ip }).catch(() => {});
    if (result.user.securityReviewRequired) await logActivity({ actorUserId: result.user.id, action: 'ADMIN_SECURITY_REVIEW_REQUIRED', targetType: 'Security', targetId: String(result.user.id), description: 'Administrator security review required after suspicious login activity.', metadata: { outcome: 'Pending' }, ipAddress: req.ip }).catch(() => {});
    return success(res, result.user, 'Login successful');
  } catch (cause) {
    return error(res, cause.status ? cause.message : 'Unable to sign in at this time.', cause.status || 500);
  }
};

exports.verificationStatus = (req,res) => {
  const pending=req.session?.pendingVerification;
  if(!pending)return error(res,'No login verification is pending.',401);
  return success(res,{verificationRequired:true,maskedEmail:pending.maskedEmail});
};

exports.verifyEmailCode = async (req,res) => {
  const pending=req.session?.pendingVerification,code=String(req.body?.code||'').trim();
  if(!pending)return error(res,'Verification session expired. Sign in again.',401);
  if(!/^\d{6}$/.test(code))return error(res,'Enter the six-digit verification code.',400);
  try{const result=await loginVerificationService.verifyChallenge({challengeId:pending.challengeId,userId:pending.userId,code});if(result.error){await logActivity({actorUserId:pending.userId,action:result.error==='EXPIRED'?'EMAIL_VERIFICATION_EXPIRED':'EMAIL_VERIFICATION_FAILED',targetType:'Security',targetId:String(pending.userId),description:result.error==='EXPIRED'?'Officer login verification code expired.':'Officer login verification failed.',metadata:{outcome:'Failure',attemptsRemaining:result.attemptsRemaining??null},ipAddress:req.ip}).catch(()=>{});if(result.error==='EXPIRED')return error(res,'Verification code expired. Sign in again.',410);if(result.error==='TOO_MANY_ATTEMPTS'){req.session.pendingVerification=null;await save(req);return error(res,'Too many incorrect verification codes. Sign in again.',429)}return error(res,'Invalid verification code.',401)}const user=await authService.completeOfficerLogin(pending.userId,req.ip);if(!user){req.session.destroy(()=>{});return error(res,'Unable to complete sign in.',401)}await regenerate(req);req.session.userId=user.id;req.session.authenticatedAt=Date.now();req.session.lastActivityAt=Date.now();await save(req);await logActivity({actorUserId:user.id,action:'EMAIL_VERIFICATION_SUCCESS',targetType:'Security',targetId:'SESSION',description:'Officer email verification succeeded.',ipAddress:req.ip}).catch(()=>{});await logActivity({actorUserId:user.id,action:'LOGIN_SUCCESS',targetType:'Security',targetId:'SESSION',description:'Officer login succeeded after email verification.',ipAddress:req.ip}).catch(()=>{});return success(res,user,'Login successful');}catch{return error(res,'Unable to verify the login code.',500)}
};

exports.resendEmailCode = async (req,res) => {
  const pending=req.session?.pendingVerification;if(!pending)return error(res,'Verification session expired. Sign in again.',401);
  try{const account=await authService.getPendingOfficer(pending.userId);if(!account){req.session.destroy(()=>{});return error(res,'Unable to resend verification code.',401)}const result=await loginVerificationService.resendChallenge({challengeId:pending.challengeId,userId:pending.userId,email:account.email});await logActivity({actorUserId:pending.userId,action:'EMAIL_VERIFICATION_RESENT',targetType:'Security',targetId:String(pending.userId),description:'Officer login verification code resent.',ipAddress:req.ip}).catch(()=>{});return success(res,{verificationRequired:true,maskedEmail:result.maskedEmail,expiresInSeconds:result.expiresInSeconds},'A new verification code was sent.')}catch(cause){return error(res,cause.status?cause.message:'Unable to resend verification code.',cause.status||500)}
};

exports.cancelEmailVerification = (req,res) => { req.session.destroy(()=>{res.clearCookie(req.app.get('sessionCookieName'),req.app.get('sessionCookieOptions'));return success(res,null,'Verification cancelled')}); };

exports.me = (req, res) => success(res, req.user);

exports.logout = async (req, res) => {
  const user = req.user;
  await logActivity({ actorUserId: user.id, action: 'LOGOUT', targetType: 'Security', targetId: 'SESSION', description: `${user.role === 'admin' ? 'Administrator' : 'Officer'} logged out.`, ipAddress: req.ip }).catch(() => {});
  req.session.destroy((sessionError) => {
    if (sessionError) return error(res, 'Unable to log out.', 500);
    res.clearCookie(req.app.get('sessionCookieName'), req.app.get('sessionCookieOptions'));
    return success(res, null, 'Logout successful');
  });
};

exports.changePassword = async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  if (!currentPassword || !newPassword || !confirmPassword) return error(res, 'All password fields are required.', 400);
  if (newPassword !== confirmPassword) return error(res, 'New password and confirmation do not match.', 400);
  try {
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    if (result.error === 'CURRENT_PASSWORD_INVALID') return error(res, 'Current password is incorrect.', 400);
    if (result.error === 'PASSWORD_REUSED') return error(res, 'New password must be different from the current password.', 400);
    if (result.error === 'PASSWORD_POLICY') return error(res, 'New password does not meet the password policy.', 400, result.errors);
    await authService.revokeUserSessions(result.user.id);
    await regenerate(req);
    req.session.userId = result.user.id;
    req.session.authenticatedAt = Date.now();
    req.session.lastActivityAt = Date.now();
    req.session.securityReviewRequired = false;
    req.session.securityReviewContext = null;
    await save(req);
    await logActivity({ actorUserId: result.user.id, action: 'PASSWORD_CHANGED', targetType: 'Security', targetId: String(result.user.id), description: 'Account password changed successfully.', ipAddress: req.ip }).catch(() => {});
    return success(res, result.user, 'Password changed successfully.');
  } catch {
    return error(res, 'Unable to change password at this time.', 500);
  }
};

exports.getSecurityReview = async (req, res) => {
  if (req.user.role !== 'admin' || !req.user.securityReviewRequired) return error(res, 'No security review is required.', 404);
  try {
    const review = await authService.getSecurityReview(req.user.id);
    if (!review) return error(res, 'No security review is required.', 404);
    const previousLogin = req.session.securityReviewContext?.previousLogin;
    return success(res, { ...review, lastSuccessfulLoginAt: previousLogin?.lastLoginAt || null, lastSuccessfulLoginIp: previousLogin?.lastLoginIp || null });
  } catch {
    return error(res, 'Unable to load security review.', 500);
  }
};

exports.completeSecurityReview = async (req, res) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['recognized', 'unrecognized'].includes(decision)) return error(res, 'A valid security review decision is required.', 400);
  try {
    const user = await authService.completeSecurityReview(req.user.id, decision);
    if (!user) return error(res, 'No security review is required.', 404);
    req.session.securityReviewRequired = false;
    req.session.securityReviewContext = null;
    await save(req);
    await logActivity({ actorUserId: user.id, action: 'ADMIN_SECURITY_REVIEW_COMPLETED', targetType: 'Security', targetId: String(user.id), description: `Administrator completed security review and marked recent activity as ${decision}.`, metadata: { decision, outcome: decision === 'recognized' ? 'Reviewed' : 'Password change required' }, ipAddress: req.ip }).catch(() => {});
    return success(res, user, decision === 'unrecognized' ? 'Security review completed. Change your password before continuing.' : 'Security review completed.');
  } catch {
    return error(res, 'Unable to complete security review.', 500);
  }
};