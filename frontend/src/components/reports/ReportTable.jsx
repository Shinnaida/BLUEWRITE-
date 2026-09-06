// BLUEWRITE — ReportTable Component
// Reusable table for displaying incident reports.

import React from 'react';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import { formatIncidentTypes } from '../../utils/constants';

function ReportTable({ reports = [], onView, onEdit, onPrint, showOfficer = false, emptyState }) {

  const columns = [
    {
      key: 'report_number',
      label: 'Report #',
      render: (row) => <span className="font-semibold text-slate-900">{row.report_number}</span>,
    },
    {
      key: 'incident_type',
      label: 'Type',
      render: (row) => <span className="text-slate-600">{formatIncidentTypes(row.incident_type) || '—'}</span>,
    },
    {
      key: 'incident_date',
      label: 'Incident Date',
      render: (row) => <span className="text-slate-600">{formatDate(row.incident_date)}</span>,
    },
    ...(showOfficer
      ? [{ key: 'officer_name', label: 'Officer', render: (row) => row.officer_name || '—' }]
      : []),
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status.toLowerCase()}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(row)} className="text-police-blue-700 hover:bg-police-blue-50 hover:text-police-blue-800">
              View
            </Button>
          )}
          {onEdit && row.status === 'Draft' && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(row)} className="text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Edit
            </Button>
          )}
          {onPrint && (
            <Button variant="ghost" size="sm" onClick={() => onPrint(row)} className="text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Print
            </Button>
          )}
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={reports} emptyMessage="No reports found" emptyState={emptyState} />;
}

export default ReportTable;