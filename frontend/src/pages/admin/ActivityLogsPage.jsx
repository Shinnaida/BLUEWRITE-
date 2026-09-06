import React, { useEffect, useMemo, useState } from 'react';
import { AlignLeft, CalendarDays, CheckCircle2, Eye, FileClock, FilePen, FilePlus2, History, LogIn, LogOut, Printer, RotateCcw, Save, Search, Send, ShieldAlert, TimerOff, UserCheck, UserCog, UserX } from 'lucide-react';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import { getActivityLog, getActivityLogs } from '../../services/activityLogService';
import { formatDateTime } from '../../utils/formatDate';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const iconByAction = { REPORT_CREATED: FilePlus2, DRAFT_SAVED: Save, REPORT_EDITED: FilePen, REPORT_SUBMITTED: Send, REPORT_VIEWED: Eye, REPORT_PRINTED: Printer, PROFILE_UPDATED: UserCog, ACCOUNT_CREATED: UserCheck, ACCOUNT_ACTIVATED: UserCheck, ACCOUNT_DEACTIVATED: UserX, ACCOUNT_UNLOCKED: UserCheck, ACCOUNT_LOCKED: ShieldAlert, PASSWORD_RESET_BY_ADMIN: UserCog, ADMIN_SECURITY_REVIEW_REQUIRED: ShieldAlert, ADMIN_SECURITY_REVIEW_COMPLETED: CheckCircle2, EMAIL_VERIFICATION_CODE_SENT: Send, EMAIL_VERIFICATION_RESENT: Send, EMAIL_VERIFICATION_SUCCESS: CheckCircle2, EMAIL_VERIFICATION_FAILED: ShieldAlert, EMAIL_VERIFICATION_EXPIRED: TimerOff, ADMIN_VIEWED_OFFICER: Eye, ADMIN_VIEWED_REPORT: Eye, LOGIN_SUCCESS: LogIn, LOGOUT: LogOut, LOGIN_FAILED: ShieldAlert, LOGIN_BLOCKED: ShieldAlert, LOGIN_THROTTLED: TimerOff, SESSION_EXPIRED: TimerOff, AI_REQUEST_FAILED: ShieldAlert, AI_WRITING_REQUEST_REJECTED: ShieldAlert, AI_SUGGESTION_ACCEPTED: CheckCircle2, AI_SUGGESTION_REJECTED: UserX };
// Activities worth highlighting in red (security-relevant events).
const ALERT_ACTIONS = new Set(['LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGIN_THROTTLED', 'ACCOUNT_LOCKED', 'EMAIL_VERIFICATION_FAILED', 'AI_REQUEST_FAILED', 'AI_WRITING_REQUEST_REJECTED', 'ADMIN_SECURITY_REVIEW_REQUIRED']);
const actionLabel = (action='') => action.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase()+word.slice(1)).join(' ');

function ActivityBadge({ action }) {
  const Icon = iconByAction[action] || AlignLeft;
  const isAlert = ALERT_ACTIONS.has(action);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isAlert ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      <Icon size={13} className={isAlert ? 'text-red-500' : 'text-blue-600'} />
      {actionLabel(action)}
    </span>
  );
}
function Detail({ label, children }) { return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{children || '—'}</dd></div>; }
const localDateTime = (value) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')} ${String(value.getHours()).padStart(2,'0')}:${String(value.getMinutes()).padStart(2,'0')}:${String(value.getSeconds()).padStart(2,'0')}`;
const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
const dateSectionLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown Date';
  const today = new Date();
  today.setHours(0,0,0,0);
  const selectedDate = new Date(date);
  selectedDate.setHours(0,0,0,0);
  const dayDifference = Math.round((today-selectedDate)/86400000);
  const calendarDate = date.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  if(dayDifference===0)return `Today — ${calendarDate}`;
  if(dayDifference===1)return `Yesterday — ${calendarDate}`;
  return calendarDate;
};

function ActivityLogsPage() {
  const [logs,setLogs] = useState([]);
  const params = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [officer, setOfficer] = useState(params.get('officer') || '');
  const [action, setAction] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(params.get('officer')));
  const pageSize = 10;
  const [loading,setLoading]=useState(true),[pagination,setPagination]=useState({total:0,totalPages:1}),[loadError,setLoadError]=useState('');
  useEffect(()=>{const t=setTimeout(async()=>{setLoading(true);try{const now=new Date(),from=new Date(now);if(dateRange==='today')from.setHours(0,0,0,0);if(dateRange==='week'){from.setDate(now.getDate()-6);from.setHours(0,0,0,0)}if(dateRange==='month'){from.setDate(1);from.setHours(0,0,0,0)}const r=await getActivityLogs({search,role,officer,action,ipAddress,sort,page,limit:pageSize,dateFrom:dateRange?localDateTime(from):undefined,dateTo:dateRange?localDateTime(now):undefined});setLogs(r.data.data);setPagination(r.data.pagination);setLoadError('')}catch{setLoadError('Unable to load activity logs.')}finally{setLoading(false)}},250);return()=>clearTimeout(t)},[search,role,officer,action,ipAddress,dateRange,sort,page]);
  const resetFilters = () => { setSearch(''); setRole(''); setOfficer(''); setAction(''); setIpAddress(''); setDateRange(''); setSort('newest'); setPage(1); };
  const update = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const hasActiveFilters = Boolean(search || role || officer || action || ipAddress || dateRange || sort !== 'newest');
  const filtered = logs;
  const totalPages = pagination.totalPages;
  const visible = filtered;
  const groupedLogs = useMemo(() => {
    const groups = new Map();
    visible.forEach((log) => {
      const key = dateKey(log.timestamp);
      if (!groups.has(key)) groups.set(key,{key,label:dateSectionLabel(log.timestamp),logs:[]});
      groups.get(key).logs.push(log);
    });
    return Array.from(groups.values());
  },[visible]);
  const columns = [
    { key: 'timestamp', label: 'Date & Time', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.timestamp)}</span> },
    { key: 'actorName', label: 'User', render: (row) => <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600 ring-1 ring-inset ring-slate-200" aria-hidden="true">{String(row.actorName||'?').split(' ').map((part)=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><p className="font-semibold text-slate-900">{row.actorName}</p><p className="text-xs text-slate-500">{row.actorId}</p></div></div> },
    { key: 'actorRole', label: 'Role' },
    { key: 'action', label: 'Activity', render: (row) => <ActivityBadge action={row.action} /> },
    { key: 'ipAddress', label: 'Source IP', render: (row) => <span className="whitespace-nowrap font-mono text-xs text-blue-700">{row.ipAddress||'—'}</span> },
    { key: 'targetId', label: 'Target', render: (row) => <div><p className="font-semibold">{row.targetName || row.targetId}</p>{row.targetName && <p className="text-xs text-slate-500">{row.targetId}</p>}</div> },
    { key: 'description', label: 'Description', render: (row) => <span className="block min-w-64 max-w-md text-slate-600">{row.description}</span> },
    { key: 'view', label: 'Action', render: (row) => <button type="button" onClick={async () => { try { const response = await getActivityLog(row.id); setSelected({ ...row, ...response.data.data }); } catch { setLoadError('Unable to load activity details.'); } }} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:underline">View Details<Eye size={14} aria-hidden="true" /></button> },
  ];

  return <div className="space-y-6">
    {/* Page header */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white shadow-md shadow-blue-700/25 sm:flex" aria-hidden="true">
          <History size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Activity Logs</h2>
          <p className="mt-0.5 text-sm text-slate-600">Review Officer, Administrator, authentication, and system actions recorded in BLUEWRITE.</p>
        </div>
      </div>
      {!loading && !loadError && (
        <span className="rounded-full bg-police-blue-50 px-3 py-1 text-xs font-bold text-police-blue-700 ring-1 ring-inset ring-police-blue-200">
          {pagination.total} {pagination.total === 1 ? 'activity' : 'activities'} on file
        </span>
      )}
    </div>

    {/* Filter toolbar */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Input name="search" placeholder="Search user, ID, report, activity, IP..." value={search} onChange={update(setSearch)} icon={Search} />
        </div>
        <div className="w-44">
          <Select name="dateRange" value={dateRange} onChange={update(setDateRange)} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 Days' }, { value: 'month', label: 'This Month' }]} placeholder="All Time" />
        </div>
        <div className="w-40">
          <Select name="role" value={role} onChange={update(setRole)} options={[{ value: 'Officer', label: 'Officer' }, { value: 'Administrator', label: 'Administrator' }]} placeholder="All Roles" />
        </div>
        <div className="w-40">
          <Select name="sort" value={sort} onChange={update(setSort)} options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]} placeholder="Sort" />
        </div>
        <Button
          variant={showAdvanced ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className={showAdvanced ? '' : 'text-slate-500 hover:text-slate-900'}
          aria-expanded={showAdvanced}
        >
          <AlignLeft size={14} className="mr-1.5" />
          {showAdvanced ? 'Hide advanced' : 'Advanced'}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 hover:text-slate-900">
            <RotateCcw size={14} className="mr-1.5" />
            Reset
          </Button>
        )}
      </div>
      {showAdvanced && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <Input name="officer" label="Officer Badge" placeholder="All Officers" value={officer} onChange={update(setOfficer)} />
          <Input name="action" label="Activity Code" value={action} onChange={update(setAction)} placeholder="e.g. REPORT_CREATED" />
          <Input name="ipAddress" label="Source IP" placeholder="192.168.1.10" value={ipAddress} onChange={update(setIpAddress)} />
        </div>
      )}
    </div>

    {/* Logs card */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
          <FileClock size={17} className="text-police-blue-700" aria-hidden="true" />
          Recorded Activities
        </h3>
        {!loading && !loadError && visible.length > 0 && (
          <p className="text-xs font-medium text-slate-500">
            Page <span className="font-bold text-slate-800">{pagination.page}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
          </p>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading activity logs..." />
      ) : loadError ? (
        <div className="py-12 text-center">
          <ShieldAlert size={36} className="mx-auto text-red-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-red-700">{loadError}</p>
          <p className="mt-1 text-xs text-slate-500">Check the connection and try again.</p>
          <Button size="sm" variant="secondary" className="mt-4" onClick={() => setPage((p) => p)}>
            <RotateCcw size={14} className="mr-1.5" />
            Retry
          </Button>
        </div>
      ) : filtered.length ? (
        <div className="space-y-7">{groupedLogs.map((group)=><section key={group.key} aria-labelledby={`activity-date-${group.key}`}><div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><h3 id={`activity-date-${group.key}`} className="flex items-center gap-2 text-sm font-bold text-blue-950 sm:text-base"><CalendarDays size={18} className="text-blue-600" />{group.label}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">{group.logs.length} {group.logs.length===1?'activity':'activities'}</span></div><Table columns={columns} data={group.logs} /></section>)}</div>
      ) : (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
            <History size={22} className="text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-900">
            {hasActiveFilters ? 'No activity matches your filters' : 'No activity yet'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {hasActiveFilters ? 'Try adjusting or resetting the filters above.' : 'Actions will be recorded here as they happen.'}
          </p>
          {hasActiveFilters && <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}><RotateCcw size={14} className="mr-1.5" />Reset Filters</Button>}
        </div>
      )}

      {!loading && !loadError && visible.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-800">{visible.length}</span> of <span className="font-bold text-slate-800">{pagination.total}</span> activities
          </p>
          {pagination.total > 0 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
        <ShieldAlert size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        Security-relevant activities (failed logins, lockouts, rejected AI requests) are highlighted in red.
      </p>
    </div>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Activity Details" footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}>
      {selected && <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2"><Detail label="Activity ID">{selected.id}</Detail><Detail label="Date & Time">{formatDateTime(selected.timestamp)}</Detail><Detail label="User">{selected.actorName} ({selected.actorId})</Detail><Detail label="Role">{selected.actorRole}</Detail><Detail label="Source IP">{selected.ip_address||selected.ipAddress}</Detail><Detail label="Action">{actionLabel(selected.action)}</Detail><Detail label="Target">{selected.targetName || selected.targetId} {selected.targetName ? `(${selected.targetId})` : ''}</Detail><div className="sm:col-span-2"><Detail label="Description">{selected.description}</Detail></div>{selected.metadata?.reportStatus && <Detail label="Report Status">{selected.metadata.reportStatus}</Detail>}{selected.metadata?.outcome && <Detail label="Security Outcome">{selected.metadata.outcome}</Detail>}{selected.metadata?.aiAction && <Detail label="AI Action">{actionLabel(selected.metadata.aiAction)}</Detail>}{selected.metadata?.instructionType && <Detail label="Instruction Type">{selected.metadata.instructionType}</Detail>}{selected.metadata?.presetKeys?.length>0 && <Detail label="Writing Presets">{selected.metadata.presetKeys.join(', ')}</Detail>}{selected.metadata?.decision && <Detail label="Officer Decision">{selected.metadata.decision}</Detail>}{selected.metadata?.factualDifferenceWarning!==undefined && <Detail label="Factual Difference Warning">{selected.metadata.factualDifferenceWarning?'Yes':'No'}</Detail>}{selected.metadata?.reason && <Detail label="Reason Code">{selected.metadata.reason}</Detail>}{selected.metadata?.attemptCount && <Detail label="Attempt Count">{selected.metadata.attemptCount}</Detail>}{selected.metadata?.authenticationMode && <Detail label="Access Mode">{selected.metadata.authenticationMode}</Detail>}{selected.metadata?.source && <Detail label="Record Source">{selected.metadata.source}</Detail>}</dl>}
    </Modal>
  </div>;
}
export default ActivityLogsPage;
