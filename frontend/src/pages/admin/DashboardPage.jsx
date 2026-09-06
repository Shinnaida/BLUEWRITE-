// BLUEWRITE — Admin DashboardPage
// Admin dashboard backed by authenticated system data.

import React from 'react';
import { FileText, CalendarDays, UserCheck, ScrollText, Activity, ChevronRight, ShieldAlert, Users, ClipboardList } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import ReportStatusOverview from '../../components/reports/ReportStatusOverview';
import { formatDateTime } from '../../utils/formatDate';
import { getAdminDashboard } from '../../services/dashboardService';

const EMPTY_STATS = {
  total_reports: 0,
  draft_reports: 0,
  submitted_reports: 0,
  active_officers: 0,
  total_officers: 0,
  disabled_officers: 0,
  activity_logs: 0,
  reports_this_month: 0,
};

// Badge styling per activity family (mirrors ActivityLogsPage highlighting).
const isSecurityAction = (action='') => ['LOGIN_FAILED','LOGIN_BLOCKED','LOGIN_THROTTLED','ACCOUNT_LOCKED','EMAIL_VERIFICATION_FAILED','AI_REQUEST_FAILED','AI_WRITING_REQUEST_REJECTED','ADMIN_SECURITY_REVIEW_REQUIRED'].includes(action);

function DashboardPage() {
  const [live,setLive]=React.useState(null),[isLoading,setIsLoading]=React.useState(true),[loadError,setLoadError]=React.useState(''),[reloadKey,setReloadKey]=React.useState(0);React.useEffect(()=>{getAdminDashboard().then(r=>{setLive(r.data.data);setLoadError('')}).catch(()=>setLoadError('Unable to load dashboard data. Please try again.')).finally(()=>setIsLoading(false))},[reloadKey]);const stats=live||EMPTY_STATS;
  const recentActivity = live?.recentActivity || [];

  return (
    <div className="page-shell space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white shadow-md shadow-blue-700/25 sm:flex" aria-hidden="true">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Admin Dashboard</h2>
            <p className="mt-0.5 text-sm text-slate-600">System overview for reports, officer accounts, and recent activity.</p>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100">Retry</button>
        </div>
      )}

      {/* Security advisory banner */}
      {live?.recentLoginSecurity?.length>0&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm"><div className="flex items-start gap-3"><ShieldAlert size={22} className="mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Recent administrator login security activity</h3><span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-bold">{live.recentLoginSecurity.length} event{live.recentLoginSecurity.length===1?'':'s'} · last 24h</span></div><p className="mt-1 text-sm">Failed, locked, or throttled login events were recorded against administrator accounts.</p><div className="mt-2 flex flex-wrap gap-2">{live.recentLoginSecurity.map((event,index)=><span key={`${event.timestamp}-${index}`} className="rounded-md bg-white px-2 py-1 font-mono text-xs ring-1 ring-amber-200">{event.ipAddress||'Unknown IP'} · {formatDateTime(event.timestamp)}</span>)}</div><a href="/admin/activity-logs" className="mt-2 inline-block text-sm font-bold text-amber-900 underline">Review security logs</a></div></div></div>}

      {/* Stats: each number appears exactly once, with context */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Reports" value={stats.total_reports||0} color="police-blue" description="All incident reports on file" />
        <StatCard icon={CalendarDays} label="This Month" value={stats.reports_this_month||0} color="police-blue" description="Reports created this month" />
        <StatCard icon={UserCheck} label="Active Officers" value={stats.active_officers||0} color="green" description={`${stats.disabled_officers||0} disabled · ${stats.total_officers||0} total`} />
        <StatCard icon={ScrollText} label="Log Entries" value={stats.activity_logs||0} color="gray" description="Recorded system activities" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportStatusOverview draftCount={live?.draft_reports} submittedCount={live?.submitted_reports} isLoading={isLoading} error={loadError} />
        <div className="section-card">
          <div className="mb-4 flex items-center justify-between"><h3 className="section-title">Officer Status Overview</h3><Users size={20} className="text-police-blue-700" /></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SnapshotItem label="Total" value={stats.total_officers||0} />
            <SnapshotItem label="Active" value={stats.active_officers||0} />
            <SnapshotItem label="Disabled" value={stats.disabled_officers||0} />
          </div>
          <p className="mt-4 text-xs text-slate-500">Officer accounts remain available for record history when disabled.</p>
        </div>
      </div>

      {/* Recent activity */}
      <div className="section-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-police-blue-700" aria-hidden="true" />
            <h3 className="section-title">Recent Officer Activity</h3>
          </div>
          <a href="/admin/activity-logs" className="text-sm font-semibold text-police-blue-700 hover:underline">View All Activity</a>
        </div>
        <div className="space-y-1">
          {recentActivity.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-b border-slate-100 px-2 py-2.5 last:border-b-0 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{log.actorName}</p>
                <p className="truncate text-xs font-medium text-slate-600">{log.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isSecurityAction(log.action) ? 'locked' : 'default'}>{log.action}</Badge>
                <span className="whitespace-nowrap text-xs font-medium text-slate-500">{formatDateTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
          {!isLoading && !loadError && recentActivity.length === 0 && (
            <p className="py-3 text-sm text-slate-500">No activity has been recorded yet.</p>
          )}
          {isLoading && <p className="py-3 text-sm text-slate-500">Loading recent activity...</p>}
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-card">
        <div className="mb-4 flex items-center gap-2"><Activity size={20} className="text-police-blue-700" aria-hidden="true" /><h3 className="section-title">Admin Quick Actions</h3></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AdminAction href="/admin/officers" label="Manage Officers" description="Create, edit, and disable accounts" />
          <AdminAction href="/admin/reports" label="View All Reports" description="Review submitted incident reports" />
          <AdminAction href="/admin/activity-logs" label="Open Activity Logs" description="Audit trail of every action" />
        </div>
      </div>
    </div>
  );
}

function SnapshotItem({ label, value }) { return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100"><p className="text-xl font-extrabold text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-600">{label}</p></div>; }
function AdminAction({ href, label, description }) { return <a href={href} className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-px hover:border-police-blue-300 hover:bg-police-blue-50 hover:shadow-md"><span className="min-w-0"><span className="block text-sm font-bold text-slate-800 group-hover:text-police-blue-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span><ChevronRight size={17} className="shrink-0 text-police-blue-700 transition-transform group-hover:translate-x-0.5" /></a>; }

export default DashboardPage;
