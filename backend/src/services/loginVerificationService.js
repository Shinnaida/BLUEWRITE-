const crypto = require('node:crypto');
const pool = require('../config/db');
const env = require('../config/env');
const mailService = require('./mailService');

const digest = (challengeId, code) => crypto.createHmac('sha256', env.mail.verificationSecret).update(`${challengeId}:${code}`).digest('hex');
const maskEmail = (email) => { const [local,domain] = String(email).split('@'); return `${local.slice(0,1)}${'*'.repeat(Math.max(2,local.length-2))}${local.length>1?local.slice(-1):''}@${domain}`; };
function ensureConfigured() {
  if (!env.mail.verificationSecret || env.mail.verificationSecret.length < 32 || !mailService.configured()) throw Object.assign(new Error('Officer email verification is unavailable. Contact an Administrator.'), { code: 'EMAIL_VERIFICATION_UNAVAILABLE', status: 503 });
}
async function enforceSendLimit(userId) {
  const [[row]] = await pool.execute('SELECT COALESCE(SUM(send_count),0) recent_sends FROM login_verification_challenges WHERE user_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? MICROSECOND)',[userId,env.mail.sendWindowMs*1000]);
  if(Number(row.recent_sends)>=env.mail.maxSends)throw Object.assign(new Error('Too many verification codes were sent. Please try again later.'),{status:429,code:'MAX_SENDS'});
}
async function createChallenge({ userId, email }) {
  ensureConfigured();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('No valid email is configured for this Officer. Contact an Administrator.'), { code: 'OFFICER_EMAIL_REQUIRED', status: 409 });
  await enforceSendLimit(userId);
  const challengeId = crypto.randomUUID(), code = String(crypto.randomInt(100000,1000000));
  await pool.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND consumed_at IS NULL',[userId]);
  await pool.execute('INSERT INTO login_verification_challenges(id,user_id,code_digest,expires_at,attempts_remaining,send_count,last_sent_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL ? MICROSECOND),?,1,NOW())',[challengeId,userId,digest(challengeId,code),env.mail.codeTtlMs*1000,env.mail.maxAttempts]);
  try { await mailService.sendOfficerLoginCode({to:email,code}); }
  catch(error){await pool.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?',[challengeId]);throw Object.assign(new Error('Unable to send the verification code. Please try again.'),{code:'EMAIL_SEND_FAILED',status:503,cause:error});}
  return { challengeId, maskedEmail: maskEmail(email), expiresInSeconds: Math.floor(env.mail.codeTtlMs/1000) };
}
async function verifyChallenge({challengeId,userId,code}) {
  const db=await pool.getConnection();
  try{await db.beginTransaction();const [[row]]=await db.execute('SELECT * FROM login_verification_challenges WHERE id=? AND user_id=? FOR UPDATE',[challengeId,userId]);if(!row||row.consumed_at){await db.rollback();return{error:'INVALID'}}if(new Date(row.expires_at).getTime()<=Date.now()){await db.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?',[challengeId]);await db.commit();return{error:'EXPIRED'}}if(row.attempts_remaining<1){await db.rollback();return{error:'TOO_MANY_ATTEMPTS'}}const valid=crypto.timingSafeEqual(Buffer.from(row.code_digest,'hex'),Buffer.from(digest(challengeId,code),'hex'));if(!valid){const remaining=row.attempts_remaining-1;await db.execute('UPDATE login_verification_challenges SET attempts_remaining=?,consumed_at=IF(?=0,CURRENT_TIMESTAMP,consumed_at) WHERE id=?',[remaining,remaining,challengeId]);await db.commit();return{error:remaining?'INVALID':'TOO_MANY_ATTEMPTS',attemptsRemaining:remaining}}await db.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?',[challengeId]);await db.commit();return{verified:true}}catch(error){await db.rollback();throw error}finally{db.release()}
}
async function resendChallenge({challengeId,userId,email}) {
  ensureConfigured();const [[row]]=await pool.execute('SELECT * FROM login_verification_challenges WHERE id=? AND user_id=?',[challengeId,userId]);if(!row||row.consumed_at)throw Object.assign(new Error('Verification session is no longer valid. Sign in again.'),{status:401,code:'INVALID_CHALLENGE'});await enforceSendLimit(userId);const wait=env.mail.resendCooldownMs-(Date.now()-new Date(row.last_sent_at).getTime());if(wait>0)throw Object.assign(new Error('Please wait before requesting another code.'),{status:429,code:'RESEND_COOLDOWN'});const code=String(crypto.randomInt(100000,1000000));await pool.execute('UPDATE login_verification_challenges SET code_digest=?,expires_at=DATE_ADD(NOW(),INTERVAL ? MICROSECOND),attempts_remaining=?,send_count=send_count+1,last_sent_at=NOW() WHERE id=?',[digest(challengeId,code),env.mail.codeTtlMs*1000,env.mail.maxAttempts,challengeId]);try{await mailService.sendOfficerLoginCode({to:email,code})}catch(error){throw Object.assign(new Error('Unable to send the verification code. Please try again.'),{status:503,code:'EMAIL_SEND_FAILED',cause:error})}return{maskedEmail:maskEmail(email),expiresInSeconds:Math.floor(env.mail.codeTtlMs/1000)};
}
module.exports={createChallenge,verifyChallenge,resendChallenge};