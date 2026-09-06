import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { calculateReportStatus } from '../../utils/reportStatus';

function StatusBar({ label, value, percentage, tone }) {
  const width = `${Math.min(100, Math.max(0, percentage))}%`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm font-semibold">
        <span className="text-slate-700">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-950">{value} ({percentage}%)</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${tone === 'amber' ? 'bg-amber-400' : 'bg-police-blue-600'}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ReportStatusOverview({ draftCount, submittedCount, isLoading = false, error = '' }) {
  const status = calculateReportStatus(draftCount, submittedCount);

  return (
    <div className="section-card">
      <div>
        <h3 className="section-title">Report Status Overview</h3>
        <p className="mt-1 text-sm text-slate-600">Track the current status of incident reports.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner size="sm" label="Loading report status..." />
      ) : error ? (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-5 space-y-5">
            <StatusBar label="Draft" value={status.draft} percentage={status.draftPercentage} tone="amber" />
            <StatusBar label="Submitted" value={status.submitted} percentage={status.submittedPercentage} tone="blue" />
          </div>

          {status.total === 0 && (
            <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No reports have been created yet.
            </p>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4 text-sm font-bold text-slate-900">
            Total Reports: <span className="tabular-nums">{status.total}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportStatusOverview;