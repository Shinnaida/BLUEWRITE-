// BLUEWRITE — PrintableReport Component
// Print-friendly view of an incident report.

import React from 'react';
import { formatDateTime } from '../../utils/formatDate';
import { formatIncidentTypes } from '../../utils/constants';

function PrintableReport({ report }) {
  if (!report) return null;

  const people = report.people?.length
    ? report.people.map((person) => [
        person.person_type.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        `${person.first_name} ${person.middle_name || ''} ${person.last_name}`.replace(/\s+/g, ' ').trim(),
      ])
    : [['People Involved', 'No people information provided']];

  return (
    <article className="print-report rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <header className="mb-6 border-b-2 border-navy-800 pb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-police-blue-700">
          Metro City Police Department
        </p>
        <h1 className="mt-1 text-2xl font-bold text-navy-800">Incident Report</h1>
        <p className="mt-1 text-sm text-slate-600">BLUEWRITE Police Reporting System</p>
      </header>

      <section className="mb-6 rounded-md bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Detail label="Report Number" value={report.report_number} />
          <Detail label="Status" value={capitalize(report.status)} />
          <Detail label="Incident Type" value={formatIncidentTypes(report.incident_type)} />
        </div>
      </section>

      <section className="mb-6">
        <SectionTitle>Report Information</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Incident Date & Time" value={formatDateTime(`${report.incident_date || ''}T${report.incident_time || '00:00'}`)} />
          <div className="sm:col-span-2">
            <Detail label="Location" value={report.location} />
          </div>
        </div>
      </section>

      <section className="mb-6">
        <SectionTitle>People Involved</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {people.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="mb-6">
        <SectionTitle>Incident Details</SectionTitle>
        <Detail label="Narrative" value={report.narrative || 'No narrative provided.'} multiline />
      </section>

      <section>
        <SectionTitle>Reporting Officer</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Officer Name" value={report.officer_name} />
          <Detail label="Badge Number" value={report.badge_number} />
        </div>
      </section>
    </article>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-3 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-navy-800">
      {children}
    </h2>
  );
}

function Detail({ label, value, multiline = false }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-1 text-sm text-slate-950 ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function capitalize(value = '') {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '—';
}

export default PrintableReport;