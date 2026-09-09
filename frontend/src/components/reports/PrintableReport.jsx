// BLUEWRITE — PrintableReport Component
// PNP memorandum-style Investigation Report print view. Follows the standard
// Philippine National Police investigation report format: header block,
// memorandum block, numbered body sections (Authority, Matters, Facts,
// Discussion, Conclusion, Recommendation), and a two-column signatory block.
// Sections without officer-entered content are omitted from the printout.

import React from 'react';
import { formatDateTime } from '../../utils/formatDate';
import { formatIncidentTypes } from '../../utils/constants';
import { fieldsForIncidentType, typeFieldLabel } from '../../utils/incidentTypeFields';

function PrintableReport({ report }) {
  if (!report) return null;

  const station = [
    'Republic of the Philippines',
    'NATIONAL POLICE COMMISSION',
    'PHILIPPINE NATIONAL POLICE',
    report.station_region || '',
    report.station_name ? `${report.station_name} POLICE STATION` : '',
    report.station_address || '',
    report.station_email ? `Email: ${report.station_email}` : '',
    report.station_contact ? `Tel. Nr.: ${report.station_contact}` : '',
  ].filter(Boolean);

  const factsNarrative = report.narrative || 'No narrative provided.';

  const bodySections = [
    ['I. AUTHORITY', report.authority],
    ['II. MATTERS TO BE INVESTIGATED', report.matters_investigated],
    ['III. FACTS OF THE CASE', factsNarrative],
    ['IV. DISCUSSION / EVALUATION', report.discussion],
    ['V. CONCLUSION', report.conclusion],
    ['VI. RECOMMENDATION', report.recommendation],
  ].filter(([, value]) => Boolean(value && String(value).trim()));

  const people = report.people?.length
    ? report.people.map((person) => [
        person.person_type.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        `${person.first_name} ${person.middle_name || ''} ${person.last_name}`.replace(/\s+/g, ' ').trim(),
      ])
    : [['People Involved', 'No people information provided']];

  // Complainant / victim / suspect / witness summary lines for the printed
  // parties block — only rendered when the structured detail fields are filled.
  const complainantLine = [
    report.complainant_full_name,
    report.complainant_age ? `${report.complainant_age} y/o` : '',
    report.complainant_sex,
    report.complainant_address,
    report.complainant_contact_number ? `Tel. ${report.complainant_contact_number}` : '',
  ].filter(Boolean).join(', ');
  const victimLine = [
    report.victim_full_name,
    report.victim_age ? `${report.victim_age} y/o` : '',
    report.victim_sex,
    report.victim_address,
    report.victim_contact_number ? `Tel. ${report.victim_contact_number}` : '',
  ].filter(Boolean).join(', ');
  const suspectLine = [
    [report.suspect_name, report.suspect_alias ? `alias "${report.suspect_alias}"` : ''].filter(Boolean).join(' '),
    report.suspect_age ? `${report.suspect_age} y/o` : '',
    report.suspect_sex,
    report.suspect_address,
    report.suspect_status ? `Status: ${report.suspect_status}` : '',
  ].filter(Boolean).join(', ');
  const witnessLine = [
    report.witness_name,
    report.witness_age ? `${report.witness_age} y/o` : '',
    report.witness_address,
    report.witness_contact_number ? `Tel. ${report.witness_contact_number}` : '',
  ].filter(Boolean).join(', ');

  // Type-specific fields (JSON blob) — only fields belonging to the selected
  // incident type(s) are rendered, in registry order, non-empty only.
  const typeSpecificRows = (() => {
    const data = report.type_specific_data && typeof report.type_specific_data === 'object' ? report.type_specific_data : {};
    return fieldsForIncidentType(report.incident_type)
      .map((def) => [def.label, data[def.name]])
      .filter(([, value]) => Boolean(value && String(value).trim()));
  })();

  const investigatorName = report.officer_name || '—';
  const investigatorRank = report.badge_number ? `Badge No. ${report.badge_number}` : '';
  const approverName = report.approving_authority_name || '';
  const approverRank = report.approving_authority_rank || '';
  const reportDate = report.incident_date || report.created_at || '';

  return (
    <article className="print-report rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {/* Header block */}
      <header className="mb-6 border-b-2 border-navy-800 pb-4 text-center">
        {station.map((line, index) => (
          <p
            key={line}
            className={
              index < 3
                ? 'text-xs font-bold uppercase tracking-[0.15em] text-navy-800'
                : 'text-xs text-slate-600'
            }
          >
            {line}
          </p>
        ))}
        <h1 className="mt-3 text-2xl font-bold text-navy-800">INVESTIGATION REPORT</h1>
        <p className="mt-1 text-sm text-slate-600">
          Re: {formatIncidentTypes(report.incident_type) || 'Incident'}
          {report.location ? ` that transpired at ${report.location}` : ''}
        </p>
      </header>

      {/* Memorandum block */}
      <section className="mb-6 text-sm">
        <p className="font-bold">MEMORANDUM</p>
        <div className="mt-2 space-y-1">
          <p>
            <span className="inline-block w-20 font-bold">FOR</span>
            {report.recipient_office || 'The Officer in Charge'}
          </p>
          <p>
            <span className="inline-block w-20 font-bold">SUBJECT</span>
            Investigation Report Re: {formatIncidentTypes(report.incident_type) || 'Incident'}
            {report.location ? ` that transpired at ${report.location}` : ''}
          </p>
          <p>
            <span className="inline-block w-20 font-bold">DATE</span>
            {reportDate || '—'}
          </p>
        </div>
      </section>

      {/* Body sections */}
      {bodySections.map(([title, value]) => (
        <section key={title} className="mb-5">
          <SectionTitle>{title}</SectionTitle>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-950">{value}</p>
        </section>
      ))}

      {/* Incident details detail blocks — omitted when entirely empty */}
      {([
        ['INCIDENT INFORMATION', [
          ['Date / Time Reported', [report.date_reported, report.time_reported].filter(Boolean).join(' ')],
          ['Barangay', report.barangay],
          ['City / Municipality', report.city],
          ['Province', report.province],
          ['Specific Place', report.specific_place],
        ]],
        ['PARTIES INVOLVED', [
          ['Complainant', complainantLine],
          ['Complainant Role', report.complainant_role],
          ['Victim', victimLine],
          ['Victim Injuries', report.victim_injuries],
          ['Victim Damage / Loss', report.victim_damage_or_loss],
          ['Suspect', suspectLine],
          ['Suspect Physical Description', report.suspect_physical_description],
          ['Witness', witnessLine],
        ]],
        ['INCIDENT ACCOUNT', [
          ['People Involved', report.people_involved],
          ['Sequence of Events', report.sequence_of_events],
          ['Actions of Suspect', report.actions_of_suspect],
          ['Actions of Victim', report.actions_of_victim],
          ['Circumstances Before', report.circumstances_before_incident],
          ['Circumstances After', report.circumstances_after_incident],
        ]],
        ['PROPERTY / DAMAGE', [
          ['Property Involved', report.property_involved],
          ['Description', report.property_description],
          ['Quantity', report.quantity],
          ['Estimated Value', report.estimated_value],
          ['Type of Damage', report.type_of_damage],
          ['Estimated Damage Cost', report.estimated_damage_cost],
        ]],
        ['WITNESS STATEMENT', [
          ['Statement', report.witness_statement],
        ]],
        ['EVIDENCE', [
          ['Evidence Available', report.evidence_available],
          ['Evidence Type', report.evidence_type],
          ['Evidence Description', report.evidence_description],
          ['Evidence Location', report.evidence_location],
          ['CCTV Available', report.cctv_available],
          ['CCTV Description', report.cctv_description],
          ['Attached Documents', report.attached_documents],
        ]],
        ['INCIDENT-SPECIFIC DETAILS', typeSpecificRows],
        ['POLICE ACTION', [
          ['Responding Officers', report.responding_officers],
          ['Initial Response', report.initial_response],
          ['Actions Taken', report.actions_taken],
          ['Evidence Collected', report.evidence_collected],
          ['Persons Interviewed', report.persons_interviewed],
          ['Medical Assistance', report.medical_assistance],
          ['Arrest Made', report.arrest_made],
          ['Referral / Endorsement', report.referral_or_endorsement],
          ['Current Case Status', report.current_case_status],
        ]],
      ]
        .map(([title, rows]) => [title, (rows || []).filter(([, value]) => Boolean(value && String(value).trim()))])
        .filter(([, rows]) => rows.length > 0)
        .map(([title, rows]) => (
          <section key={title} className="mb-5">
            <SectionTitle>{title}</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <Detail key={label} label={label} value={value} multiline />
              ))}
            </div>
          </section>
        )))}

      {/* Reporting officer preparation stamp */}
      {(report.report_date || report.report_time) && (
        <p className="mb-5 text-xs text-slate-600">
          Report prepared on {report.report_date || '—'}{report.report_time ? ` at ${report.report_time}` : ''}.
        </p>
      )}

      {/* Case identifiers + people involved */}
      <section className="mb-6 rounded-md bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Detail label="Report Number" value={report.report_number} />
          <Detail label="Status" value={capitalize(report.status)} />
          <Detail label="Incident Date & Time" value={formatDateTime(`${report.incident_date || ''}T${report.incident_time || '00:00'}`)} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {people.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      {/* Signatory block */}
      <section className="mt-10 text-sm">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <div>
            <p className="mb-8 font-bold uppercase tracking-wide">Investigated by:</p>
            <p className="border-t border-slate-400 pt-1 font-semibold">{investigatorName}</p>
            {investigatorRank && <p className="text-xs text-slate-600">{investigatorRank}</p>}
            <p className="text-xs text-slate-600">Investigator</p>
          </div>
          <div>
            <p className="mb-8 font-bold uppercase tracking-wide">Approved for filing / Noted by:</p>
            <p className="border-t border-slate-400 pt-1 font-semibold">{approverName || '\u00A0'}</p>
            {approverRank && <p className="text-xs text-slate-600">{approverRank}</p>}
            <p className="text-xs text-slate-600">Chief of Police / Officer-in-Charge</p>
          </div>
        </div>
      </section>

      {/* Draft disclosure */}
      <footer className="mt-10 border-t border-slate-200 pt-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          AI-assisted draft generated by BLUEWRITE. Sections I–VI above reflect Officer-reviewed content;
          the incident narrative (Section III) may contain AI-assisted wording. This document requires review
          and approval by the responsible Investigator and Chief of Police / Officer-in-Charge before filing.
        </p>
      </footer>
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
