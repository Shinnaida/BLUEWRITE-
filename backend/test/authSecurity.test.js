process.env.NODE_ENV = 'test';
// The unconfigured-provider assertions below target the Google AI Studio path;
// local Ollama mode is verified at runtime instead.
process.env.OLLAMA_ONLY = 'false';
process.env.LOGIN_DELAY_THIRD_MS = '0';
process.env.LOGIN_DELAY_FOURTH_MS = '0';
process.env.MAIL_MODE = 'json';
process.env.EMAIL_VERIFICATION_SECRET = 'test-only-email-verification-secret-48265937';
process.env.EMAIL_RESEND_COOLDOWN_MS = '1000';
process.env.EMAIL_SEND_WINDOW_MS = '60000';
process.env.GEMINI_API_KEY = '';

const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const app = require('../src/app');
const authService = require('../src/services/authService');
const mailService = require('../src/services/mailService');
const { hashPassword } = require('../src/utils/password');

const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const names = {
  admin: `testadmin_${stamp}`,
  officerA: `testoffa_${stamp}`,
  officerB: `testoffb_${stamp}`,
  inactive: `testoffx_${stamp}`,
};
const passwords = {
  admin: 'AdminLocal!4826',
  temporary: 'Temporary!4826',
  permanent: 'Permanent!5937',
  changed: 'ChangedLater!7048',
  adminChanged: 'AdministratorChanged!7048',
};
const ids = { users: [], officers: [], reports: [] };
const issuedVerificationCodes = new Set();

function client(baseUrl) {
  let cookie = '';
  return {
    async request(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(options.headers || {}) };
      if (cookie) headers.Cookie = cookie;
      const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      return { status: response.status, body };
    },
    clearCookie() { cookie = ''; },
  };
}

function latestVerificationCode() {
  const message = mailService.getLastTestMessage();
  const match = message?.text?.match(/\b(\d{6})\b/);
  assert.ok(match, 'Expected a six-digit code in the test mail transport.');
  issuedVerificationCodes.add(match[1]);
  return match[1];
}

async function startOfficerLogin(httpClient, username, password) {
  const response = await httpClient.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.verificationRequired, true);
  assert.equal(Object.hasOwn(response.body.data, 'code'), false);
  return { response, code: latestVerificationCode() };
}

async function completeOfficerLogin(httpClient, code) {
  return httpClient.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ code }) });
}

async function insertUser(username, password, role, active = true, mustChange = false) {
  const [result] = await pool.execute(
    'INSERT INTO users(username,password_hash,role,is_active,must_change_password) VALUES (?,?,?,?,?)',
    [username, await hashPassword(password), role, active, mustChange]
  );
  ids.users.push(result.insertId);
  return result.insertId;
}

async function insertOfficer(userId, suffix, status = 'Active') {
  const [result] = await pool.execute(
    'INSERT INTO officers(user_id,badge_number,first_name,last_name,`rank`,unit,department,email,status) VALUES (?,?,?,?,?,?,?,?,?)',
    [userId, `TEST-${suffix}-${stamp}`, 'Security', `Officer${suffix}`, 'Officer', 'Test Unit', 'Test Department', `security.${suffix}.${stamp}@example.test`, status]
  );
  ids.officers.push(result.insertId);
  return result.insertId;
}

async function insertReport(officerId, suffix) {
  const [result] = await pool.execute(
    "INSERT INTO reports(report_number,officer_id,title,incident_type,incident_date,incident_time,location,summary,narrative,status) VALUES (?,?,?,?,CURRENT_DATE,'10:00:00',?,?,?,'Draft')",
    [`TEST-${stamp}-${suffix}`, officerId, `Security Test ${suffix}`, 'Other', 'Test location', 'Test summary', 'A factual narrative used only for automated authorization testing.']
  );
  ids.reports.push(result.insertId);
  return result.insertId;
}

async function cleanup() {
  if (ids.users.length) await pool.execute(`DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) IN (${ids.users.map(() => '?').join(',')}) OR JSON_UNQUOTE(JSON_EXTRACT(data, '$.pendingVerification.userId')) IN (${ids.users.map(() => '?').join(',')})`, [...ids.users.map(String),...ids.users.map(String)]);
  await pool.execute(`DELETE FROM activity_logs WHERE actor_user_id IS NULL AND target_id IN (?,?,?,?)`, [names.admin, names.officerA, names.officerB, `missing_${stamp}`]);
  if (ids.users.length) await pool.execute(`DELETE FROM activity_logs WHERE actor_user_id IN (${ids.users.map(() => '?').join(',')})`, ids.users);
  if (ids.reports.length) {
    await pool.execute(`DELETE FROM report_people WHERE report_id IN (${ids.reports.map(() => '?').join(',')})`, ids.reports);
    await pool.execute(`DELETE FROM reports WHERE id IN (${ids.reports.map(() => '?').join(',')})`, ids.reports);
  }
  if (ids.officers.length) await pool.execute(`DELETE FROM officers WHERE id IN (${ids.officers.map(() => '?').join(',')})`, ids.officers);
  if (ids.users.length) await pool.execute(`DELETE FROM users WHERE id IN (${ids.users.map(() => '?').join(',')})`, ids.users);
}

(async () => {
  let server;
  try {
    const adminId = await insertUser(names.admin, passwords.admin, 'admin');
    const officerAUserId = await insertUser(names.officerA, passwords.temporary, 'officer', true, true);
    const officerAId = await insertOfficer(officerAUserId, 'A');
    const officerBUserId = await insertUser(names.officerB, passwords.permanent, 'officer');
    const officerBId = await insertOfficer(officerBUserId, 'B');
    const inactiveUserId = await insertUser(names.inactive, passwords.permanent, 'officer', false);
    await insertOfficer(inactiveUserId, 'X', 'Disabled');
    const reportAId = await insertReport(officerAId, 'A');
    const reportBId = await insertReport(officerBId, 'B');

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const unauthenticatedAi = await client(baseUrl).request('/ai/report-assist', { method: 'POST', body: JSON.stringify({ action: 'generate', reportId: reportAId, reportData: {} }) });
    assert.equal(unauthenticatedAi.status, 401);

    const unknown = client(baseUrl);
    const unknownLogin = await unknown.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: `missing_${stamp}`, password: 'WrongPassword!1' }) });
    assert.equal(unknownLogin.status, 401);
    assert.equal(unknownLogin.body.message, 'Invalid username or password.');

    // Route-level throttling must be isolated by username. Repeated failures for
    // one local account must not block a different account sharing the same IP.
    for (let attempt = 1; attempt < 10; attempt += 1) {
      const repeated = await unknown.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: `missing_${stamp}`, password: 'WrongPassword!1' }) });
      assert.equal(repeated.status, 401);
    }
    const throttled = await unknown.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: `missing_${stamp}`, password: 'WrongPassword!1' }) });
    assert.equal(throttled.status, 429);
    const unaffectedAdmin = client(baseUrl);
    assert.equal((await unaffectedAdmin.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: names.admin, password: passwords.admin }) })).status, 200);
    assert.equal((await unaffectedAdmin.request('/auth/logout', { method: 'POST' })).status, 200);

    const wrong = client(baseUrl);
    const wrongLogin = await wrong.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: names.officerB, password: 'WrongPassword!1' }) });
    assert.equal(wrongLogin.status, 401);
    assert.equal(wrongLogin.body.message, unknownLogin.body.message);

    const officerA = client(baseUrl);
    const firstLogin = await startOfficerLogin(officerA, names.officerA, passwords.temporary);
    assert.equal((await officerA.request('/dashboard/officer')).status, 401);
    assert.equal((await officerA.request('/auth/verify-email/status')).status, 200);
    assert.equal((await completeOfficerLogin(officerA, '000000')).status, 401);
    const firstVerification = await completeOfficerLogin(officerA, firstLogin.code);
    assert.equal(firstVerification.status, 200);
    assert.equal(firstVerification.body.data.mustChangePassword, true);
    const gated = await officerA.request('/dashboard/officer');
    assert.equal(gated.status, 403);

    const firstChange = await officerA.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: passwords.temporary, newPassword: passwords.permanent, confirmPassword: passwords.permanent }) });
    assert.equal(firstChange.status, 200);
    assert.equal(firstChange.body.data.mustChangePassword, false);
    assert.equal((await officerA.request('/dashboard/officer')).status, 200);
    await officerA.request('/auth/logout', { method: 'POST' });

    const oldPassword = await client(baseUrl).request('/auth/login', { method: 'POST', body: JSON.stringify({ username: names.officerA, password: passwords.temporary }) });
    assert.equal(oldPassword.status, 401);
    const relogin = client(baseUrl);
    const reloginPending = await startOfficerLogin(relogin, names.officerA, passwords.permanent);
    assert.equal((await completeOfficerLogin(relogin, reloginPending.code)).status, 200);
    const wrongCurrent = await relogin.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: 'WrongCurrent!1', newPassword: passwords.changed, confirmPassword: passwords.changed }) });
    assert.equal(wrongCurrent.status, 400);
    assert.equal((await relogin.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: passwords.permanent, newPassword: passwords.changed, confirmPassword: passwords.changed }) })).status, 200);

    await pool.execute('UPDATE users SET failed_login_attempts=0,account_locked=FALSE,locked_until=NULL WHERE id=?', [officerBUserId]);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await authService.authenticate(names.officerB, 'Incorrect!9999', { ipAddress: '192.168.10.21' });
      if (attempt < 5) assert.equal(result.error, 'INVALID_CREDENTIALS');
      else assert.equal(result.error, 'OFFICER_LOCKED');
    }
    assert.equal((await authService.authenticate(names.officerB, passwords.permanent, { ipAddress: '192.168.10.21' })).error, 'OFFICER_LOCKED');
    const [[lockedOfficer]] = await pool.execute('SELECT account_locked,failed_login_attempts FROM users WHERE id=?',[officerBUserId]);
    assert.equal(lockedOfficer.account_locked,1);
    assert.equal(lockedOfficer.failed_login_attempts,5);

    const admin = client(baseUrl);
    assert.equal((await admin.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: names.admin, password: passwords.admin }) })).status, 200);
    assert.equal((await admin.request('/officers')).status, 200);
    assert.equal((await admin.request(`/officers/${officerBId}/unlock`, { method: 'PATCH' })).status, 200);
    assert.equal((await authService.authenticate(names.officerB, passwords.permanent, { ipAddress: '192.168.10.21' })).user.id, officerBUserId);

    const inactive = await client(baseUrl).request('/auth/login', { method: 'POST', body: JSON.stringify({ username: names.inactive, password: passwords.permanent }) });
    assert.equal(inactive.status, 401);
    assert.equal(inactive.body.message, 'Invalid username or password.');

    const officerB = client(baseUrl);
    const officerBPending=await startOfficerLogin(officerB,names.officerB,passwords.permanent);
    assert.equal((await completeOfficerLogin(officerB,officerBPending.code)).status,200);
    const adminEndpoint = await officerB.request('/officers');
    assert.equal(adminEndpoint.status, 403);
    assert.equal((await officerB.request(`/reports/${reportBId}`)).status, 200);
    assert.equal((await officerB.request(`/reports/${reportAId}`)).status, 404);
    const crossOfficerAi = await officerB.request('/ai/report-assist', { method: 'POST', body: JSON.stringify({ action: 'generate', reportId: reportAId, reportData: { narrative: 'Attempted cross-Officer AI request.' } }) });
    assert.equal(crossOfficerAi.status, 404);
    const unconfiguredAi = await officerB.request('/ai/report-assist', { method: 'POST', body: JSON.stringify({ action: 'generate', reportId: reportBId, reportData: { incident_type: 'Other', location: 'Test location', narrative: 'Officer-entered facts remain available when Google AI Studio is not configured.' } }) });
    assert.equal(unconfiguredAi.status, 503);
    assert.equal(unconfiguredAi.body.message, 'Google AI Studio integration is not configured. Set GEMINI_API_KEY in the backend environment.');
    const impersonation = await officerB.request('/reports', { method: 'POST', body: JSON.stringify({ officer_id: officerAId, title: 'Ownership test', summary: 'Ownership test summary' }) });
    assert.equal(impersonation.status, 201);
    ids.reports.push(impersonation.body.data.id);
    assert.equal(impersonation.body.data.officer_id, officerBId);

    const noSession = await client(baseUrl).request('/dashboard/officer');
    assert.equal(noSession.status, 401);
    assert.equal((await officerB.request('/auth/logout', { method: 'POST' })).status, 200);
    assert.equal((await officerB.request('/dashboard/officer')).status, 401);

    const generatedUsername = `generated_${stamp}`;
    const generatedAccount = await admin.request('/officers', { method: 'POST', body: JSON.stringify({ username: generatedUsername, role: 'admin', badge_number: `GEN-${stamp}`, first_name: 'Generated', last_name: 'Officer', email: `generated.${stamp}@example.test`, status: 'Active' }) });
    assert.equal(generatedAccount.status, 201);
    assert.equal(generatedAccount.body.data.credentials.username, generatedUsername);
    assert.match(generatedAccount.body.data.credentials.temporaryPassword, /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/);
    const generatedOfficer = generatedAccount.body.data.officer;
    ids.users.push(generatedOfficer.user_id);
    ids.officers.push(generatedOfficer.id);
    const [[generatedRow]] = await pool.execute('SELECT role,must_change_password,password_hash FROM users WHERE id=?', [generatedOfficer.user_id]);
    assert.equal(generatedRow.role, 'officer');
    assert.equal(generatedRow.must_change_password, 1);
    assert.match(generatedRow.password_hash, /^\$2[aby]\$12\$/);
    assert.notEqual(generatedRow.password_hash, generatedAccount.body.data.credentials.temporaryPassword);
    const fetchedGenerated = await admin.request(`/officers/${generatedOfficer.id}`);
    assert.equal(fetchedGenerated.status, 200);
    assert.equal(Object.hasOwn(fetchedGenerated.body.data, 'credentials'), false);

    const invalidEmailUpdate=await admin.request(`/officers/${generatedOfficer.id}`,{method:'PUT',body:JSON.stringify({email:'not-an-email'})});
    assert.equal(invalidEmailUpdate.status,400);
    const duplicateEmailUpdate=await admin.request(`/officers/${generatedOfficer.id}`,{method:'PUT',body:JSON.stringify({email:`security.A.${stamp}@example.test`})});
    assert.equal(duplicateEmailUpdate.status,409);
    const updatedEmail=`updated.generated.${stamp}@example.test`;
    const validEmailUpdate=await admin.request(`/officers/${generatedOfficer.id}`,{method:'PUT',body:JSON.stringify({email:updatedEmail})});
    assert.equal(validEmailUpdate.status,200);
    assert.equal(validEmailUpdate.body.data.email,updatedEmail);
    const pendingBeforeEmailChange=client(baseUrl);
    await startOfficerLogin(pendingBeforeEmailChange,generatedUsername,generatedAccount.body.data.credentials.temporaryPassword);
    const replacementEmail=`replacement.generated.${stamp}@example.test`;
    assert.equal((await admin.request(`/officers/${generatedOfficer.id}`,{method:'PUT',body:JSON.stringify({email:replacementEmail})})).status,200);
    assert.equal((await pendingBeforeEmailChange.request('/auth/verify-email/status')).status,401);
    const expiredVerification=client(baseUrl);
    const expiredPending=await startOfficerLogin(expiredVerification,generatedUsername,generatedAccount.body.data.credentials.temporaryPassword);
    await pool.execute('UPDATE login_verification_challenges SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE user_id=? AND consumed_at IS NULL',[generatedOfficer.user_id]);
    assert.equal((await completeOfficerLogin(expiredVerification,expiredPending.code)).status,410);
    const limitedVerification=client(baseUrl);
    await startOfficerLogin(limitedVerification,generatedUsername,generatedAccount.body.data.credentials.temporaryPassword);
    for(let attempt=1;attempt<=5;attempt+=1){const result=await completeOfficerLogin(limitedVerification,'000000');assert.equal(result.status,attempt<5?401:429);}

    const tamperingOfficer = client(baseUrl);
    const tamperingPending=await startOfficerLogin(tamperingOfficer,names.officerB,passwords.permanent);
    assert.equal((await completeOfficerLogin(tamperingOfficer,tamperingPending.code)).status,200);
    const roleTamper = await tamperingOfficer.request('/reports', { method: 'POST', body: JSON.stringify({ role: 'admin', officer_id: officerAId, title: 'Role tamper test', summary: 'Role values from the client must have no effect.' }) });
    assert.equal(roleTamper.status, 201);
    ids.reports.push(roleTamper.body.data.id);
    assert.equal(roleTamper.body.data.officer_id, officerBId);
    const tamperedMe = await tamperingOfficer.request('/auth/me');
    assert.equal(tamperedMe.status, 200);
    assert.equal(tamperedMe.body.data.role, 'officer');

    const resetResponse = await admin.request(`/officers/${officerBId}/reset-password`, { method: 'POST' });
    assert.equal(resetResponse.status,200);
    assert.match(resetResponse.body.data.credentials.temporaryPassword,/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/);
    const [[resetRow]]=await pool.execute('SELECT must_change_password,account_locked,password_hash FROM users WHERE id=?',[officerBUserId]);
    assert.equal(resetRow.must_change_password,1);
    assert.equal(resetRow.account_locked,0);
    assert.notEqual(resetRow.password_hash,resetResponse.body.data.credentials.temporaryPassword);
    await pool.execute('UPDATE login_verification_challenges SET created_at=DATE_SUB(NOW(),INTERVAL 16 MINUTE) WHERE user_id=?',[officerBUserId]);
    const resetOfficerClient=client(baseUrl);
    const resetPending=await startOfficerLogin(resetOfficerClient,names.officerB,resetResponse.body.data.credentials.temporaryPassword);
    const [[pendingChallenge]]=await pool.execute('SELECT id FROM login_verification_challenges WHERE user_id=? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1',[officerBUserId]);
    await pool.execute('UPDATE login_verification_challenges SET last_sent_at=DATE_SUB(NOW(),INTERVAL 2 SECOND) WHERE id=?',[pendingChallenge.id]);
    const resend=await resetOfficerClient.request('/auth/verify-email/resend',{method:'POST'});
    assert.equal(resend.status,200);
    const resentCode=latestVerificationCode();
    assert.notEqual(resentCode,resetPending.code);
    assert.equal((await completeOfficerLogin(resetOfficerClient,resetPending.code)).status,401);
    const resetVerified=await completeOfficerLogin(resetOfficerClient,resentCode);
    assert.equal(resetVerified.status,200);
    assert.equal(resetVerified.body.data.mustChangePassword,true);

    await admin.request('/auth/logout', { method: 'POST' });
    const adminAttack = client(baseUrl);
    for(let attempt=1;attempt<=5;attempt+=1){const response=await adminAttack.request('/auth/login',{method:'POST',body:JSON.stringify({username:names.admin,password:'IncorrectAdmin!9999'})});assert.equal(response.status,attempt<5?401:429);}
    const [[lockedAdmin]]=await pool.execute('SELECT account_locked,locked_until,security_review_required FROM users WHERE id=?',[adminId]);
    assert.equal(lockedAdmin.account_locked,0);
    assert.ok(lockedAdmin.locked_until);
    assert.equal(lockedAdmin.security_review_required,1);
    assert.equal((await client(baseUrl).request('/auth/login',{method:'POST',body:JSON.stringify({username:names.admin,password:passwords.admin})})).status,429);
    await pool.execute('UPDATE users SET locked_until=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?',[adminId]);
    const reviewedAdmin=client(baseUrl);
    const postLockLogin=await reviewedAdmin.request('/auth/login',{method:'POST',body:JSON.stringify({username:names.admin,password:passwords.admin})});
    assert.equal(postLockLogin.status,200);
    assert.equal(postLockLogin.body.data.securityReviewRequired,true);
    assert.equal((await reviewedAdmin.request('/dashboard/admin')).status,403);
    const review=await reviewedAdmin.request('/auth/security-review');
    assert.equal(review.status,200);
    assert.ok(review.body.data.attempts.length>=5);
    assert.ok(review.body.data.attempts.every((attempt)=>attempt.sourceIp));
    const recognized=await reviewedAdmin.request('/auth/security-review',{method:'POST',body:JSON.stringify({decision:'recognized'})});
    assert.equal(recognized.status,200);
    assert.equal(recognized.body.data.securityReviewRequired,false);
    assert.equal((await reviewedAdmin.request('/dashboard/admin')).status,200);

    await pool.execute('UPDATE users SET security_review_required=TRUE WHERE id=?',[adminId]);
    const refreshedAdmin=await reviewedAdmin.request('/auth/me');
    assert.equal(refreshedAdmin.body.data.securityReviewRequired,true);
    const unrecognized=await reviewedAdmin.request('/auth/security-review',{method:'POST',body:JSON.stringify({decision:'unrecognized'})});
    assert.equal(unrecognized.status,200);
    assert.equal(unrecognized.body.data.mustChangePassword,true);
    assert.equal((await reviewedAdmin.request('/dashboard/admin')).status,403);
    const weakAdminPassword=await reviewedAdmin.request('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:passwords.admin,newPassword:'ShortAdmin!12',confirmPassword:'ShortAdmin!12'})});
    assert.equal(weakAdminPassword.status,400);
    const changedAdminPassword=await reviewedAdmin.request('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:passwords.admin,newPassword:passwords.adminChanged,confirmPassword:passwords.adminChanged})});
    assert.equal(changedAdminPassword.status,200);
    assert.equal((await reviewedAdmin.request('/dashboard/admin')).status,200);

    const [databaseChecks] = await pool.execute(`SELECT username,password_hash,must_change_password FROM users WHERE id IN (${ids.users.map(() => '?').join(',')})`, ids.users);
    assert.ok(databaseChecks.every((row) => /^\$2[aby]\$12\$/.test(row.password_hash)));
    assert.ok(databaseChecks.every((row) => !Object.values(passwords).includes(row.password_hash)));
    const [sensitiveColumns] = await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME IN ('password','temporary_password','plain_password')");
    assert.equal(sensitiveColumns.length, 0);
    const [securityLogs] = await pool.execute(`SELECT action,description,metadata,ip_address FROM activity_logs WHERE actor_user_id IN (${ids.users.map(() => '?').join(',')})`, ids.users);
    assert.ok(securityLogs.some((row) => row.action === 'LOGIN_SUCCESS'));
    assert.ok(securityLogs.some((row) => row.action === 'PASSWORD_CHANGED'));
    assert.ok(securityLogs.some((row) => row.action === 'UNAUTHORIZED_REPORT_ACCESS'));
    assert.ok(securityLogs.some((row) => row.action === 'ACCOUNT_UNLOCKED'));
    assert.ok(securityLogs.some((row) => row.action === 'PASSWORD_RESET_BY_ADMIN'));
    assert.ok(securityLogs.some((row) => row.action === 'ADMIN_SECURITY_REVIEW_REQUIRED'));
    assert.ok(securityLogs.some((row) => row.action === 'ADMIN_SECURITY_REVIEW_COMPLETED'));
    assert.ok(securityLogs.some((row) => row.action === 'EMAIL_VERIFICATION_CODE_SENT'));
    assert.ok(securityLogs.some((row) => row.action === 'EMAIL_VERIFICATION_FAILED'));
    assert.ok(securityLogs.some((row) => row.action === 'EMAIL_VERIFICATION_SUCCESS'));
    assert.ok(securityLogs.some((row) => row.action === 'EMAIL_VERIFICATION_RESENT'));
    assert.ok(securityLogs.filter((row) => ['LOGIN_SUCCESS','LOGIN_FAILED','ACCOUNT_LOCKED'].includes(row.action)).every((row) => row.ip_address));
    assert.ok(securityLogs.every((row) => !Object.values(passwords).some((password) => `${row.description || ''}${row.metadata || ''}`.includes(password))));
    assert.ok(securityLogs.every((row) => [...issuedVerificationCodes].every((code) => !`${row.description || ''}${row.metadata || ''}`.includes(code))));

    console.log('Authentication security tests passed: local login, forced/normal password changes, lockout, status, sessions, roles, ownership, logout, hashing, and audit checks.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cleanup().catch((error) => console.error('Test cleanup failed:', error.code || error.message));
    await pool.end();
  }
})().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
