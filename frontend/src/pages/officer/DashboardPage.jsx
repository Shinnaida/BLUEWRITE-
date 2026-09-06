// BLUEWRITE — Officer DashboardPage
// Officer dashboard: greeting, contextual stats, actionable drafts, recent reports.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FilePlus, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, History, Hourglass } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import ReportTable from '../../components/reports/ReportTable';
import { getOfficerDashboard } from '../../services/dashboardService';
import { useAuth } from '../../hooks/useAuth';

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 60 * 1000) return 'just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [live, setLive] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');
    getOfficerDashboard()
      .then((r) => { if (!cancelled) { setLive(r.data.data); setLoadError(''); } })
      .catch(() => { if (!cancelled) setLoadError('Unable to load your dashboard. Please try again.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const stats = live || { total_reports: 0, draft_reports: 0, submitted_reports: 0, reports_this_week: 0, reports_last_week: 0 };
  const draftReports = live?.draftReports || [];
  const recentReports = live?.recentReports || [];

  const week = Number(stats.reports_this_week) || 0;
  const lastWeek = Number(stats.reports_last_week) || 0;
  const weekDelta = week - lastWeek;

  // Recently-touched drafts (continue where you left off): most recent first.
  const recentDrafts = [...draftReports].reverse().slice(0, 3);

  const firstName = user?.firstName || user?.first_name || user?.username || '';

  const openDraft = (report) => navigate(`/officer/reports/${report.id}/edit`);

  return (
    <div className="page-shell space-y-6">
      {/* Header: single source for the create action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
            {greetingFor(new Date())}{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="section-description">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          onClick={() => navigate('/officer/reports/new')}
          className="shadow-md shadow-blue-700/20 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-700/25"
        >
          <FilePlus size={16} className="mr-2" />
          New Report
        </Button>
      </div>

      {/* Stats: each number appears exactly once, with context */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Reports" value={stats.total_reports || 0} color="police-blue" description="All reports on file" />
        <StatCard
          icon={Hourglass}
          label="Drafts"
          value={stats.draft_reports || 0}
          color="amber"
          description={isLoading ? 'Loading…' : (Number(stats.draft_reports) > 0 ? 'See Needs Your Attention' : 'Nothing pending')}
        />
        <StatCard icon={CheckCircle2} label="Submitted" value={stats.submitted_reports || 0} color="green" description="Finalized reports" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200">
              <History size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-600">This Week</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-tight text-slate-950">{week}</p>
                {!isLoading && lastWeek > 0 && weekDelta !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${weekDelta > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {weekDelta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(weekDelta)} vs last week
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">{lastWeek > 0 ? `${lastWeek} last week` : 'No reports last week'}</p>
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}{' '}
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
        </div>
      )}

      {/* Needs attention: drafts in two groups, no duplication with stats */}
      <div className="section-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="section-title">Needs Your Attention</h3>
            <p className="mt-1 text-sm text-slate-600">Your draft reports, so nothing sits unfinished.</p>
          </div>
          {Number(stats.draft_reports) > 0 && (
            <Button variant="link" size="sm" onClick={() => navigate('/officer/reports?status=draft')}>
              View all drafts
            </Button>
          )}
        </div>

        {isLoading && <p className="py-3 text-sm text-slate-500">Loading your drafts...</p>}

        {!isLoading && !loadError && draftReports.length === 0 && (
          <p className="py-3 text-sm text-slate-500">No draft reports — you're all caught up.</p>
        )}

        {!isLoading && !loadError && draftReports.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Oldest first: neglected work */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Oldest first</p>
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {draftReports.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:rounded-t-lg last:rounded-b-lg">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{item.report_number}</p>
                      <p className="truncate text-sm text-slate-600">
                        {item.title || item.incident_type || 'Untitled draft'} · last edited {relativeTime(item.updated_at)}
                      </p>
                    </div>
                    <Button variant="link" size="sm" onClick={() => openDraft(item)}>Continue</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently touched: pick up where you left off */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Recently updated</p>
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {recentDrafts.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:rounded-t-lg last:rounded-b-lg">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{item.report_number}</p>
                      <p className="truncate text-sm text-slate-600">
                        {item.title || item.incident_type || 'Untitled draft'} · {relativeTime(item.updated_at)}
                      </p>
                    </div>
                    <Button variant="link" size="sm" onClick={() => openDraft(item)}>Resume</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI assistant: actionable entry point into the editor */}
      <div className="section-card border-police-blue-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              <h3 className="section-title">BLUEWRITE AI Assistant</h3>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Writing assistance lives inside the report editor — grammar help, completeness suggestions, and narrative review.
              {draftReports.length > 0 ? ' Jump back into a draft to try it.' : ' Start a new report to use it.'}
            </p>
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
              AI suggestions are writing assistance only. The reporting officer remains responsible for reviewing and verifying all report information.
            </p>
          </div>
          <Button variant="secondary" onClick={() => (draftReports.length > 0 ? openDraft(draftReports[draftReports.length - 1]) : navigate('/officer/reports/new'))}>
            <Sparkles size={16} className="mr-2" />
            {draftReports.length > 0 ? 'Open latest draft' : 'Start a report'}
          </Button>
        </div>
      </div>

      {/* Recent reports */}
      <div className="section-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Recent Reports</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/officer/reports')}>
            View All
          </Button>
        </div>
        <ReportTable
          reports={recentReports}
          onView={(report) => navigate(`/officer/reports/${report.id}`)}
          onEdit={(report) => navigate(`/officer/reports/${report.id}/edit`)}
          onPrint={(report) => navigate(`/officer/reports/${report.id}?print=true`)}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
