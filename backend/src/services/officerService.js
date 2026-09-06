const pool = require('../config/db');
const { logActivity } = require('./logService');
const { generateTemporaryPassword, hashPassword } = require('../utils/password');

const fields = 'o.id,o.user_id,o.badge_number,o.first_name,o.middle_name,o.last_name,o.`rank`,o.unit,o.department,o.email,o.phone,o.status,o.created_at,o.updated_at,u.username,u.role,u.is_active,u.account_locked,u.failed_login_attempts,u.locked_until,u.last_login_at,u.last_login_ip,u.must_change_password';
const normalizeStatus = (value) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : value;

async function listOfficers(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const where = [], values = [];
  if (query.search) {
    const q = `%${query.search.trim()}%`;
    where.push("(o.badge_number LIKE ? OR CONCAT_WS(' ',o.first_name,o.middle_name,o.last_name) LIKE ? OR o.unit LIKE ?)");
    values.push(q, q, q);
  }
  if (query.status) { where.push('o.status=?'); values.push(normalizeStatus(query.status)); }
  if (query.locked === 'true') where.push('u.account_locked=TRUE');
  if (query.unit) { where.push('o.unit=?'); values.push(query.unit); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) total FROM officers o JOIN users u ON u.id=o.user_id ${clause}`, values);
  const [rows] = await pool.execute(`SELECT ${fields} FROM officers o JOIN users u ON u.id=o.user_id ${clause} ORDER BY o.last_name,o.first_name LIMIT ${limit} OFFSET ${(page-1)*limit}`, values);
  return { rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total/limit)) } };
}
async function getOfficer(id, db = pool) { const [rows] = await db.execute(`SELECT ${fields} FROM officers o JOIN users u ON u.id=o.user_id WHERE o.id=?`,[id]); return rows[0]||null; }
const conflict = (code, message) => Object.assign(new Error(message), { code, status: 409 });
async function createOfficer(data, actorUserId) {
  const username = data.username.trim().toLowerCase();
  const badgeNumber = data.badge_number.trim();
  const firstName = data.first_name.trim();
  const lastName = data.last_name.trim();
  const email = data.email?.trim() || null;
  const status = normalizeStatus(data.status || 'Active');
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const [[existingUser]] = await db.execute('SELECT id FROM users WHERE LOWER(username)=? LIMIT 1', [username]);
    if (existingUser) throw conflict('USERNAME_EXISTS', 'Username is already in use.');
    const [[existingBadge]] = await db.execute('SELECT id FROM officers WHERE badge_number=? LIMIT 1', [badgeNumber]);
    if (existingBadge) throw conflict('BADGE_EXISTS', 'Badge number is already assigned to another Officer.');
    if (email) {
      const [[existingEmail]] = await db.execute('SELECT id FROM officers WHERE email=? LIMIT 1', [email]);
      if (existingEmail) throw conflict('EMAIL_EXISTS', 'Email is already assigned to another Officer.');
    }
    const [user] = await db.execute(
      "INSERT INTO users(username,password_hash,role,is_active,must_change_password) VALUES (?,?,'officer',?,TRUE)",
      [username, passwordHash, status === 'Active']
    );
    const [result] = await db.execute(
      'INSERT INTO officers(user_id,badge_number,first_name,middle_name,last_name,`rank`,unit,department,email,phone,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [user.insertId, badgeNumber, firstName, data.middle_name?.trim() || null, lastName, data.rank?.trim() || null, data.unit?.trim() || null, data.department?.trim() || null, email, data.phone?.trim() || null, status]
    );
    await logActivity({
      actorUserId,
      action: 'ACCOUNT_CREATED',
      targetType: 'Officer',
      targetId: badgeNumber,
      description: `Administrator created Officer account for ${firstName} ${lastName} (Badge #${badgeNumber}).`,
      metadata: { username, status },
    }, db);
    await db.commit();
    return { officer: await getOfficer(result.insertId), credentials: { username, temporaryPassword } };
  } catch(e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
async function updateOfficer(id,data,actorUserId,ipAddress=null){const db=await pool.getConnection();try{await db.beginTransaction();const old=await getOfficer(id,db);if(!old){await db.rollback();return null}const keys=['badge_number','first_name','middle_name','last_name','rank','unit','department','email','phone'];const vals=keys.map(k=>data[k]===undefined?old[k]:(data[k]||null));await db.execute(`UPDATE officers SET ${keys.map(k=>`\`${k}\`=?`).join(',')} WHERE id=?`,[...vals,id]);const emailChanged=data.email!==undefined&&data.email!==old.email;if(emailChanged){await db.execute("DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))=? OR JSON_UNQUOTE(JSON_EXTRACT(data, '$.pendingVerification.userId'))=?",[String(old.user_id),String(old.user_id)]);await db.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND consumed_at IS NULL',[old.user_id])}await logActivity({actorUserId,action:'PROFILE_UPDATED',targetType:'Officer',targetId:data.badge_number||old.badge_number,description:`Updated Officer ${data.first_name||old.first_name} ${data.last_name||old.last_name} profile.`,metadata:{emailChanged},ipAddress},db);await db.commit();return getOfficer(id)}catch(e){await db.rollback();throw e}finally{db.release()}}
async function updateStatus(id,status,actorUserId,ipAddress=null){const normalized=normalizeStatus(status),old=await getOfficer(id);if(!old)return null;const db=await pool.getConnection();try{await db.beginTransaction();await db.execute('UPDATE officers SET status=? WHERE id=?',[normalized,id]);await db.execute('UPDATE users SET is_active=? WHERE id=?',[normalized==='Active',old.user_id]);if(normalized!=='Active'){await db.execute("DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))=? OR JSON_UNQUOTE(JSON_EXTRACT(data, '$.pendingVerification.userId'))=?",[String(old.user_id),String(old.user_id)]);await db.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND consumed_at IS NULL',[old.user_id])}await logActivity({actorUserId,action:normalized==='Active'?'ACCOUNT_ACTIVATED':'ACCOUNT_DEACTIVATED',targetType:'Officer',targetId:old.badge_number,description:`${normalized==='Active'?'Activated':'Deactivated'} Officer ${old.first_name} ${old.last_name}.`,metadata:{status:normalized},ipAddress},db);await db.commit();return getOfficer(id);}catch(e){await db.rollback();throw e;}finally{db.release();}}

async function unlockOfficer(id,actorUserId,ipAddress=null){const db=await pool.getConnection();try{await db.beginTransaction();const old=await getOfficer(id,db);if(!old){await db.rollback();return null}await db.execute('UPDATE users SET account_locked=FALSE,failed_login_attempts=0,locked_until=NULL WHERE id=? AND role=\'officer\'',[old.user_id]);await db.execute("DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))=?",[String(old.user_id)]);await logActivity({actorUserId,action:'ACCOUNT_UNLOCKED',targetType:'Officer',targetId:old.badge_number,description:`Administrator unlocked Officer ${old.first_name} ${old.last_name}.`,metadata:{previousAttemptCount:Number(old.failed_login_attempts||0)},ipAddress},db);await db.commit();return getOfficer(id);}catch(e){await db.rollback();throw e}finally{db.release()}}

async function resetOfficerPassword(id,actorUserId,ipAddress=null){const temporaryPassword=generateTemporaryPassword(),passwordHash=await hashPassword(temporaryPassword),db=await pool.getConnection();try{await db.beginTransaction();const old=await getOfficer(id,db);if(!old){await db.rollback();return null}await db.execute('UPDATE users SET password_hash=?,must_change_password=TRUE,account_locked=FALSE,failed_login_attempts=0,locked_until=NULL,password_changed_at=CURRENT_TIMESTAMP WHERE id=? AND role=\'officer\'',[passwordHash,old.user_id]);await db.execute("DELETE FROM auth_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))=? OR JSON_UNQUOTE(JSON_EXTRACT(data, '$.pendingVerification.userId'))=?",[String(old.user_id),String(old.user_id)]);await db.execute('UPDATE login_verification_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND consumed_at IS NULL',[old.user_id]);await logActivity({actorUserId,action:'PASSWORD_RESET_BY_ADMIN',targetType:'Officer',targetId:old.badge_number,description:`Administrator reset the password for Officer ${old.first_name} ${old.last_name}.`,metadata:{username:old.username,mustChangePassword:true},ipAddress},db);await db.commit();return{officer:await getOfficer(id),credentials:{username:old.username,temporaryPassword}}}catch(e){await db.rollback();throw e}finally{db.release()}}

module.exports={listOfficers,getOfficer,createOfficer,updateOfficer,updateStatus,unlockOfficer,resetOfficerPassword};
