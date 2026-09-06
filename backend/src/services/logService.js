const pool = require('../config/db');

async function logActivity(event, executor = pool) {
  const { actorUserId = null, action, targetType, targetId = null, description, metadata = null, ipAddress = null } = event;
  await executor.execute(
    'INSERT INTO activity_logs (actor_user_id, action, target_type, target_id, description, metadata, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [actorUserId, action, targetType, targetId, description, metadata ? JSON.stringify(metadata) : null, ipAddress]
  );
}

module.exports = { logActivity };
module.exports.list=async(q)=>{const page=Math.max(1,parseInt(q.page)||1),limit=Math.min(100,Math.max(1,parseInt(q.limit)||10)),w=[],v=[];if(q.search){w.push('(l.action LIKE ? OR l.target_id LIKE ? OR l.description LIKE ? OR u.username LIKE ? OR o.badge_number LIKE ? OR l.ip_address LIKE ?)');const x=`%${q.search}%`;v.push(x,x,x,x,x,x)}if(q.ipAddress){w.push('l.ip_address LIKE ?');v.push(`%${q.ipAddress.trim()}%`)}if(q.actorId){w.push('l.actor_user_id=?');v.push(q.actorId)}if(q.officer){w.push('o.badge_number=?');v.push(q.officer)}if(q.role){w.push('u.role=?');v.push(q.role.toLowerCase()==='administrator'?'admin':q.role.toLowerCase())}if(q.action){w.push('l.action=?');v.push(q.action)}if(q.dateFrom){w.push('l.created_at>=?');v.push(q.dateFrom)}if(q.dateTo){w.push('l.created_at<=?');v.push(q.dateTo)}const c=w.length?`WHERE ${w.join(' AND ')}`:'';const joins='FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_user_id LEFT JOIN officers o ON o.user_id=u.id';const [[{total}]]=await pool.execute(`SELECT COUNT(*) total ${joins} ${c}`,v);const order=q.sort==='oldest'?'ASC':'DESC';const [rows]=await pool.execute(`SELECT l.*,u.username actorName,CASE u.role WHEN 'admin' THEN 'Administrator' ELSE 'Officer' END actorRole,o.badge_number actorId ${joins} ${c} ORDER BY l.created_at ${order} LIMIT ${limit} OFFSET ${(page-1)*limit}`,v);return{rows:rows.map(x=>({...x,timestamp:x.created_at,ipAddress:x.ip_address,metadata:typeof x.metadata==='string'?JSON.parse(x.metadata):x.metadata,targetId:x.target_id})),pagination:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}}};
module.exports.get=async id=>{const [rows]=await pool.execute('SELECT * FROM activity_logs WHERE id=?',[id]);const row=rows[0];if(!row)return null;return{...row,metadata:typeof row.metadata==='string'?JSON.parse(row.metadata):row.metadata}};
