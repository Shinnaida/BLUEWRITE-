const pool=require('../config/db');
exports.admin=async(adminUserId)=>{const [[r]]=await pool.query("SELECT COUNT(*) total_reports,COALESCE(SUM(status='Draft'),0) draft_reports,COALESCE(SUM(status='Submitted'),0) submitted_reports,COALESCE(SUM(YEAR(created_at)=YEAR(CURRENT_DATE) AND MONTH(created_at)=MONTH(CURRENT_DATE)),0) reports_this_month FROM reports");const [[o]]=await pool.query("SELECT COUNT(*) total_officers,COALESCE(SUM(status='Active'),0) active_officers,COALESCE(SUM(status='Disabled'),0) disabled_officers FROM officers");const [[l]]=await pool.query('SELECT COUNT(*) activity_logs FROM activity_logs');const [recentActivity]=await pool.query("SELECT l.id,l.action,l.target_id targetId,l.description,l.created_at timestamp,u.username actorName FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_user_id ORDER BY l.created_at DESC LIMIT 5");const [recentLoginSecurity]=await pool.execute("SELECT action,ip_address ipAddress,created_at timestamp FROM activity_logs WHERE actor_user_id=? AND action IN ('LOGIN_FAILED','ACCOUNT_LOCKED','LOGIN_THROTTLED') AND created_at>=DATE_SUB(NOW(),INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT 5",[adminUserId]);return{...r,...o,...l,recentActivity,recentLoginSecurity}};

exports.officer=async(id)=>{
  const [[s]]=await pool.execute(
    `SELECT
      COUNT(*) total_reports,
      COALESCE(SUM(status='Draft'),0) draft_reports,
      COALESCE(SUM(status='Submitted'),0) submitted_reports,
      COALESCE(SUM(DATE(created_at)=CURRENT_DATE),0) reports_today,
      COALESCE(SUM(YEARWEEK(created_at,1)=YEARWEEK(CURRENT_DATE,1)),0) reports_this_week,
      COALESCE(SUM(YEARWEEK(created_at,1)=YEARWEEK(CURRENT_DATE,1)-1),0) reports_last_week,
      COALESCE(SUM(YEAR(created_at)=YEAR(CURRENT_DATE) AND MONTH(created_at)=MONTH(CURRENT_DATE)),0) reports_this_month
    FROM reports WHERE officer_id=?`,
    [id]
  );
  // Oldest-touched drafts first: the longest-neglected work rises to the top.
  const [draftReports]=await pool.execute(
    `SELECT id,report_number,title,incident_type,incident_date,status,created_at,updated_at
    FROM reports
    WHERE officer_id=? AND status='Draft'
    ORDER BY updated_at ASC
    LIMIT 5`,
    [id]
  );
  const [recentReports]=await pool.execute(
    `SELECT id,report_number,title,incident_type,incident_date,status,created_at,updated_at
    FROM reports
    WHERE officer_id=?
    ORDER BY updated_at DESC
    LIMIT 6`,
    [id]
  );
  const counts=Object.fromEntries(Object.entries(s).map(([key,value])=>[key,Number(value)||0]));
  return{...counts,draftReports,recentReports};
};
