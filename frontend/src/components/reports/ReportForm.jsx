// BLUEWRITE — ReportForm Component
// Incident report form with Report Information, People Involved, and Incident Details sections.

import React from 'react';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import { CheckCircle2 } from 'lucide-react';

function ReportForm({
  formData = {},
  errors = {},
  onChange,
  disabled = false,
  incidentTypes = [],
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  return (
    <div className="space-y-6">
      {/* Report Information */}
      <section className="section-card">
        <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-bold text-slate-950">
          Report Information
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Report Number"
            name="report_number"
            value={formData.report_number || ''}
            onChange={handleChange}
            placeholder="Auto-generated"
            disabled
          />
          <IncidentTypeBubbles
            label="Incident Type"
            value={formData.incident_type || ''}
            options={incidentTypes}
            error={errors.incident_type}
            required
            disabled={disabled}
            onChange={(next) => onChange({ ...formData, incident_type: next })}
          />
          <Input
            label="Report Title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            placeholder="Brief report title"
            disabled={disabled}
          />
          <Input
            label="Incident Date"
            name="incident_date"
            type="date"
            value={formData.incident_date || ''}
            onChange={handleChange}
            error={errors.incident_date}
            required
            disabled={disabled}
          />
          <Input
            label="Incident Time"
            name="incident_time"
            type="time"
            value={formData.incident_time || ''}
            onChange={handleChange}
            error={errors.incident_time}
            required
            disabled={disabled}
          />
          <Input
            label="Location"
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            placeholder="Incident location"
            error={errors.location}
            required
            disabled={disabled}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* People Involved */}
      <section className="section-card">
        <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-bold text-slate-950">
          People Involved
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Complainant"
            name="complainant"
            value={formData.complainant || ''}
            onChange={handleChange}
            placeholder="Name of complainant"
            disabled={disabled}
          />
          <Input
            label="Victim"
            name="victim"
            value={formData.victim || ''}
            onChange={handleChange}
            placeholder="Name of victim"
            disabled={disabled}
          />
          <Input
            label="Suspect"
            name="suspect"
            value={formData.suspect || ''}
            onChange={handleChange}
            placeholder="Name of suspect"
            disabled={disabled}
          />
          <Input
            label="Witness"
            name="witness"
            value={formData.witness || ''}
            onChange={handleChange}
            placeholder="Name of witness"
            disabled={disabled}
          />
        </div>
      </section>

      {/* Incident Details */}
      <section className="section-card">
        <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-bold text-slate-950">
          Incident Details
        </h2>
        <div>
          <Textarea
            label="Summary"
            name="summary"
            value={formData.summary || ''}
            onChange={handleChange}
            placeholder="Brief factual summary of the incident"
            rows={4}
            disabled={disabled}
          />
          <div className="mt-4">
          <Textarea
            label="Narrative"
            name="narrative"
            value={formData.narrative || ''}
            onChange={handleChange}
            placeholder="Enter the raw incident information and narrative details..."
            rows={10}
            error={errors.narrative}
            disabled={disabled}
          />
          </div>
        </div>
      </section>
    </div>
  );
}

// Multi-select bubble group for incident types. Stores the selection as a
// comma-separated slug list (e.g. "theft,assault") — same format used by the
// chat-guided Create flow, so both editors stay consistent.
function IncidentTypeBubbles({ label, value, options, error, required, disabled, onChange }) {
  const selectedList = String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
  const selectedSlugs = selectedList.filter((v) => !v.startsWith('other:'));
  const customOther = selectedList.find((v) => v.startsWith('other:'))?.slice(6) || '';
  const isSelected = (o) => (
    o.value === 'other'
      ? selectedList.includes('other') || Boolean(customOther)
      : selectedSlugs.includes(o.value)
  );
  const toggle = (o) => {
    if (o.value === 'other') {
      const rest = selectedList.filter((v) => v !== 'other' && !v.startsWith('other:'));
      return selectedList.includes('other') || customOther ? rest.join(',') : [...selectedList, 'other'].join(',');
    }
    return isSelected(o)
      ? selectedList.filter((v) => v !== o.value).join(',')
      : [...selectedList, o.value].join(',');
  };

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </p>
      <div
        className={`flex flex-wrap gap-1.5 rounded-lg border bg-white p-2.5 ${error ? 'border-red-400' : 'border-slate-300'} ${disabled ? 'opacity-60' : ''}`}
        role="group"
        aria-label={`${label} (multiple choice)`}
      >
        {options.map((o) => {
          const selected = isSelected(o);
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(toggle(o))}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed ${selected ? 'border-police-blue-700 bg-police-blue-700 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-police-blue-500 hover:bg-police-blue-100/60 hover:text-police-blue-700'}`}
            >
              {selected && <CheckCircle2 size={12} aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
      {(selectedList.includes('other') || customOther) && (
        <input
          type="text"
          value={customOther}
          disabled={disabled}
          onChange={(e) => {
            const custom = e.target.value.trim();
            const rest = selectedList.filter((v) => !v.startsWith('other:'));
            const next = custom ? [...rest, `other:${custom}`].join(',') : rest.join(',');
            onChange(next);
          }}
          placeholder="Specify the other incident type..."
          aria-label="Specify other incident type"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"
        />
      )}
      <p className="mt-1 text-[11px] text-slate-500">Select all that apply.</p>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export default ReportForm;