// BLUEWRITE — Officer MyReportsPage
// My reports page with search, status filter, and database-backed data (Phase 1.3).

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, RotateCcw, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import ReportTable from '../../components/reports/ReportTable';
import { getReports } from '../../services/reportService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { REPORT_STATUS_OPTIONS, INCIDENT_TYPE_OPTIONS } from '../../utils/constants';
import Pagination from '../../components/common/Pagination';

const localDate = (value) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const SORT_PRESETS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'number', label: 'Report Number' },
  { value: 'date', label: 'Incident Date' },
];

function MyReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') === 'draft' ? 'draft' : '';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [incidentType, setIncidentType] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [reports,setReports]=useState([]),[pagination,setPagination]=useState({total:0,totalPages:1}),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const load=async()=>{setLoading(true);setLoadError('');try{const normalizedStatus=status?status[0].toUpperCase()+status.slice(1).toLowerCase():'';const now=new Date(),from=new Date(now);if(dateRange==='today')from.setHours(0,0,0,0);if(dateRange==='week'){from.setDate(now.getDate()-6);from.setHours(0,0,0,0)}if(dateRange==='month'){from.setDate(1);from.setHours(0,0,0,0)}const r=await getReports({search,status:normalizedStatus,incidentType,sort,page,limit:pageSize,dateFrom:dateRange?localDate(from):undefined,dateTo:dateRange?localDate(now):undefined});setReports(r.data.data);setPagination(r.data.pagination)}catch{setLoadError('Unable to load reports.')}finally{setLoading(false)}};
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t)},[search,status,incidentType,dateRange,sort,page]);
  const resetFilters = () => { setSearch(''); setStatus(''); setIncidentType(''); setDateRange(''); setSort('newest'); setPage(1); };
  const hasActiveFilters = Boolean(search || status || incidentType || dateRange);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">My Reports</h2>
            {!loading && pagination.total > 0 && (
              <span className="rounded-full bg-police-blue-50 px-2.5 py-0.5 text-xs font-bold text-police-blue-700 ring-1 ring-inset ring-police-blue-200">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">View and manage your incident reports.</p>
        </div>
        <Button
          onClick={() => navigate('/officer/reports/new')}
          className="shadow-md shadow-blue-700/20 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-700/25"
        >
          <Plus size={16} className="mr-2" />
          Create Report
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              name="search"
              placeholder="Search report #, title, type, or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Search size={16} />}
            />
          </div>
          <div className="w-36">
            <Select name="status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={REPORT_STATUS_OPTIONS} placeholder="All Statuses" />
          </div>
          <div className="w-40">
            <Select name="incidentType" value={incidentType} onChange={(e) => { setIncidentType(e.target.value); setPage(1); }} options={INCIDENT_TYPE_OPTIONS} placeholder="All Types" />
          </div>
          <div className="w-36">
            <Select name="dateRange" value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} options={DATE_PRESETS} placeholder="All Time" />
          </div>
          <div className="w-40">
            <Select name="sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} options={SORT_PRESETS} placeholder="Sort" />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 hover:text-slate-900">
              <RotateCcw size={14} className="mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Reports table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ReportTable
          reports={reports}
          onView={(report) => navigate(`/officer/reports/${report.id}`)}
          onEdit={(report) => navigate(`/officer/reports/${report.id}/edit`)}
          onPrint={(report) => navigate(`/officer/reports/${report.id}?print=true`)}
          emptyState={{
            icon: FileText,
            title: 'No reports found',
            description: hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Create your first incident report to get started.',
            action: !hasActiveFilters ? { label: 'Create Report', onClick: () => navigate('/officer/reports/new') } : null,
          }}
        />
        {loading && <LoadingSpinner text="Loading reports..." />}
        {loadError && <div className="py-4 text-center text-sm font-medium text-red-700">{loadError} <Button size="sm" variant="secondary" onClick={load}>Retry</Button></div>}
        {(pagination.totalPages > 1 || reports.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{reports.length}</span> of <span className="font-bold text-slate-800">{pagination.total}</span> reports
            </p>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default MyReportsPage;
