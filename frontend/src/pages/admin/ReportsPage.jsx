// BLUEWRITE — Admin ReportsPage
// All reports with search, status, type, and sort filters.
// Only Draft and Submitted statuses — no approval workflow.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, FileText, ShieldAlert, FileSearch, FileClock } from 'lucide-react';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import ReportTable from '../../components/reports/ReportTable';
import { getReports } from '../../services/reportService';
import { REPORT_STATUS_OPTIONS, INCIDENT_TYPE_OPTIONS } from '../../utils/constants';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'number', label: 'Report Number' },
];

function ReportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [reports,setReports]=useState([]),[pagination,setPagination]=useState({total:0,totalPages:1}),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const load=async()=>{setLoading(true);setLoadError('');try{const normalizedStatus=status?status[0].toUpperCase()+status.slice(1).toLowerCase():'';const r=await getReports({search,status:normalizedStatus,incidentType,sort,page,limit:pageSize});setReports(r.data.data);setPagination(r.data.pagination);setLoadError('')}catch{setLoadError('Unable to load reports.')}finally{setLoading(false)}};
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t)},[search,status,incidentType,sort,page]);
  const resetFilters = () => { setSearch(''); setStatus(''); setIncidentType(''); setSort('newest'); setPage(1); };
  const hasActiveFilters = Boolean(search || status || incidentType || sort !== 'newest');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white shadow-md shadow-blue-700/25 sm:flex" aria-hidden="true">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">All Reports</h2>
            <p className="mt-0.5 text-sm text-slate-600">View incident reports from all officers.</p>
          </div>
        </div>
        {!loading && !loadError && (
          <span className="rounded-full bg-police-blue-50 px-3 py-1 text-xs font-bold text-police-blue-700 ring-1 ring-inset ring-police-blue-200">
            {pagination.total} {pagination.total === 1 ? 'report' : 'reports'} on file
          </span>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              name="search"
              placeholder="Search by report #, title, type, or officer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>
          <div className="w-36">
            <Select
              name="status"
              placeholder="All Statuses"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              options={REPORT_STATUS_OPTIONS}
            />
          </div>
          <div className="w-40">
            <Select name="incidentType" value={incidentType} onChange={(e) => { setIncidentType(e.target.value); setPage(1); }} options={INCIDENT_TYPE_OPTIONS} placeholder="All Types" />
          </div>
          <div className="w-40">
            <Select name="sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} options={SORT_OPTIONS} placeholder="Sort" />
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
            <FileClock size={17} className="text-police-blue-700" aria-hidden="true" />
            Incident Reports
          </h3>
          {!loading && !loadError && reports.length > 0 && (
            <p className="text-xs font-medium text-slate-500">
              Page <span className="font-bold text-slate-800">{pagination.page}</span> of <span className="font-bold text-slate-800">{pagination.totalPages}</span>
            </p>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading reports..." />
        ) : loadError ? (
          <div className="py-12 text-center">
            <ShieldAlert size={36} className="mx-auto text-red-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-red-700">{loadError}</p>
            <p className="mt-1 text-xs text-slate-500">Check the connection and try again.</p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={load}>
              <RotateCcw size={14} className="mr-1.5" />
              Retry
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
              <FileSearch size={22} className="text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">
              {hasActiveFilters ? 'No reports match your filters' : 'No reports yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters ? 'Try adjusting your search, status, or type filters.' : 'Reports will appear here once officers create them.'}
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="secondary" className="mt-4" onClick={resetFilters}>
                <RotateCcw size={14} className="mr-1.5" />
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <ReportTable
            reports={reports}
            showOfficer
            onView={(report) => navigate(`/admin/reports/${report.id}`)}
            onPrint={(report) => navigate(`/admin/reports/${report.id}?print=true`)}
          />
        )}

        {!loading && !loadError && reports.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{reports.length}</span> of <span className="font-bold text-slate-800">{pagination.total}</span> reports
            </p>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          <FileClock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Reports have only two statuses: Draft and Submitted. No approval workflow exists.
        </p>
      </div>
    </div>
  );
}

export default ReportsPage;
