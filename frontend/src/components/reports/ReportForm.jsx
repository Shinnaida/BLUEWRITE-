// BLUEWRITE — ReportForm Component
// Incident report form covering the 10-section BLUEWRITE input spec:
// 1. Incident Information, 2. Complainant, 3. Victim, 4. Suspect,
// 5. Incident Details, 6. Property/Damage, 7. Witness, 8. Evidence,
// 9. Police Action, 10. Reporting Officer — plus the PNP memorandum header,
// the AI-assisted §III narrative, officer-authored PNP sections, and the
// signatory block.

import React from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';
import { fieldsForIncidentType, TYPE_LABELS } from '../../utils/incidentTypeFields';
import {
  BadgeCheck, Bot, CheckCircle2, Eye, FileText, Gavel, HeartPulse,
  Landmark, Package, PenLine, ScrollText, ShieldAlert, User, Users,
} from 'lucide-react';

const SEX_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const YES_NO_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const SUSPECT_STATUS_OPTIONS = [
  { value: 'At Large', label: 'At Large' },
  { value: 'Arrested', label: 'Arrested' },
  { value: 'Identified', label: 'Identified' },
  { value: 'Unknown', label: 'Unknown' },
];

const CASE_STATUS_OPTIONS = [
  { value: 'Under Investigation', label: 'Under Investigation' },
  { value: 'Cleared', label: 'Cleared' },
  { value: 'Referred to Prosecutor', label: 'Referred to Prosecutor' },
  { value: 'Closed', label: 'Closed' },
];

function SectionHeading({ icon: Icon, title, description, number }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-slate-200 pb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-police-blue-50 text-police-blue-700">
        <Icon size={17} />
      </span>
      <div>
        <h2 className="text-base font-bold text-slate-950">{number ? `${number}. ${title}` : title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ReportForm({
  formData = {},
  errors = {},
  onChange,
  disabled = false,
  incidentTypes = [],
  onDraftWithAI = () => {},
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  // Dynamic type-specific fields (JSON blob) for the selected incident type(s).
  const typeSpecific = formData.type_specific_data && typeof formData.type_specific_data === 'object' ? formData.type_specific_data : {};
  const setTypeValue = (name, value) => {
    onChange({ ...formData, type_specific_data: { ...typeSpecific, [name]: value } });
  };
  const dynamicFields = fieldsForIncidentType(formData.incident_type);

  return (
    <div className="space-y-6">
      {/* 1. Incident Information */}
      <section className="section-card">
        <SectionHeading icon={FileText} number={1} title="Incident Information" description="Core details that identify, classify, and locate the incident." />
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
            label="Date Reported"
            name="date_reported"
            type="date"
            value={formData.date_reported || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Input
            label="Time Reported"
            name="time_reported"
            type="time"
            value={formData.time_reported || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Input
            label="Incident Location"
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            placeholder="Incident location"
            error={errors.location}
            required
            disabled={disabled}
            className="md:col-span-2"
          />
          <Input
            label="Barangay"
            name="barangay"
            value={formData.barangay || ''}
            onChange={handleChange}
            placeholder="e.g., Brgy. San Isidro"
            disabled={disabled}
          />
          <Input
            label="City / Municipality"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            placeholder="e.g., Quezon City"
            disabled={disabled}
          />
          <Input
            label="Province"
            name="province"
            value={formData.province || ''}
            onChange={handleChange}
            placeholder="e.g., Metro Manila"
            disabled={disabled}
          />
          <Input
            label="Specific Place"
            name="specific_place"
            value={formData.specific_place || ''}
            onChange={handleChange}
            placeholder="e.g., in front of No. 12 Rizal St."
            disabled={disabled}
          />
        </div>
      </section>

      {/* Dynamic type-specific details — field set changes with incident type */}
      {dynamicFields.length > 0 && (
        <section className="section-card">
          <SectionHeading
            icon={Package}
            title="Type-Specific Details"
            description={
              (() => {
                const slugs = String(formData.incident_type || '').split(',').map((s) => s.trim()).filter(Boolean);
                const labels = slugs.map((s) => (s.startsWith('other:') ? TYPE_LABELS.other : TYPE_LABELS[s])).filter(Boolean);
                return labels.length ? `Fields for: ${labels.join(', ')}.` : 'Fields for the selected incident type.';
              })()
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {dynamicFields.map((def) => {
              const value = typeSpecific[def.name] || '';
              const setValue = (next) => setTypeValue(def.name, next);
              if (def.type === 'textarea') {
                return (
                  <Textarea
                    key={def.name}
                    label={def.label}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={2}
                    disabled={disabled}
                    className="md:col-span-2"
                  />
                );
              }
              if (def.type === 'select') {
                return (
                  <Select
                    key={def.name}
                    label={def.label}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    options={def.options}
                    placeholder="Select"
                    disabled={disabled}
                  />
                );
              }
              return (
                <Input
                  key={def.name}
                  label={def.label}
                  type={def.type === 'number' ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* PNP Memorandum — Header & Recipient */}
      <section className="section-card">
        <SectionHeading icon={Landmark} title="PNP memorandum header" description="Station identification and memo recipient used on the printed Investigation Report. Optional — defaults to the generic BLUEWRITE header when left blank." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Station Name"
            name="station_name"
            value={formData.station_name || ''}
            onChange={handleChange}
            placeholder="e.g., Quezon City Police Station"
            disabled={disabled}
          />
          <Input
            label="Regional Office"
            name="station_region"
            value={formData.station_region || ''}
            onChange={handleChange}
            placeholder="e.g., PRO NCR"
            disabled={disabled}
          />
          <Input
            label="Station Address"
            name="station_address"
            value={formData.station_address || ''}
            onChange={handleChange}
            placeholder="City/Municipality, Province, ZIP Code"
            disabled={disabled}
          />
          <Input
            label="Station Email"
            name="station_email"
            type="email"
            value={formData.station_email || ''}
            onChange={handleChange}
            placeholder="station@example.gov.ph"
            disabled={disabled}
          />
          <Input
            label="Station Contact Number"
            name="station_contact"
            value={formData.station_contact || ''}
            onChange={handleChange}
            placeholder="Tel. Nr."
            disabled={disabled}
          />
          <Input
            label="Memo Recipient (FOR)"
            name="recipient_office"
            value={formData.recipient_office || ''}
            onChange={handleChange}
            placeholder="e.g., Officer in Charge, Provincial Office"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 2. Complainant Information */}
      <section className="section-card">
        <SectionHeading icon={User} number={2} title="Complainant Information" description="The person who reported the incident." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Full Name"
            name="complainant_full_name"
            value={formData.complainant_full_name || ''}
            onChange={handleChange}
            placeholder="First name, middle initial, last name"
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              name="complainant_age"
              type="number"
              min="0"
              max="130"
              value={formData.complainant_age || ''}
              onChange={handleChange}
              placeholder="e.g., 34"
              disabled={disabled}
            />
            <Select
              label="Sex"
              name="complainant_sex"
              value={formData.complainant_sex || ''}
              onChange={handleChange}
              options={SEX_OPTIONS}
              placeholder="Select sex"
              disabled={disabled}
            />
          </div>
          <Input
            label="Address"
            name="complainant_address"
            value={formData.complainant_address || ''}
            onChange={handleChange}
            placeholder="Residential address"
            disabled={disabled}
            className="md:col-span-2"
          />
          <Input
            label="Contact Number"
            name="complainant_contact_number"
            type="tel"
            value={formData.complainant_contact_number || ''}
            onChange={handleChange}
            placeholder="e.g., 0917 123 4567"
            disabled={disabled}
          />
          <Input
            label="Role"
            name="complainant_role"
            value={formData.complainant_role || ''}
            onChange={handleChange}
            placeholder="e.g., Victim's spouse, eyewitness"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 3. Victim Information */}
      <section className="section-card">
        <SectionHeading icon={HeartPulse} number={3} title="Victim Information" description="The person against whom the offense was committed." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Full Name"
            name="victim_full_name"
            value={formData.victim_full_name || ''}
            onChange={handleChange}
            placeholder="First name, middle initial, last name"
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              name="victim_age"
              type="number"
              min="0"
              max="130"
              value={formData.victim_age || ''}
              onChange={handleChange}
              placeholder="e.g., 28"
              disabled={disabled}
            />
            <Select
              label="Sex"
              name="victim_sex"
              value={formData.victim_sex || ''}
              onChange={handleChange}
              options={SEX_OPTIONS}
              placeholder="Select sex"
              disabled={disabled}
            />
          </div>
          <Input
            label="Address"
            name="victim_address"
            value={formData.victim_address || ''}
            onChange={handleChange}
            placeholder="Residential address"
            disabled={disabled}
          />
          <Input
            label="Contact Number"
            name="victim_contact_number"
            type="tel"
            value={formData.victim_contact_number || ''}
            onChange={handleChange}
            placeholder="e.g., 0918 765 4321"
            disabled={disabled}
          />
          <Textarea
            label="Injuries"
            name="victim_injuries"
            value={formData.victim_injuries || ''}
            onChange={handleChange}
            placeholder="Injuries sustained, or 'none'"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
          <Textarea
            label="Damage or Loss"
            name="victim_damage_or_loss"
            value={formData.victim_damage_or_loss || ''}
            onChange={handleChange}
            placeholder="Damage to property or items lost"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* 4. Suspect Information */}
      <section className="section-card">
        <SectionHeading icon={ShieldAlert} number={4} title="Suspect Information" description="The person suspected of committing the offense." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Name"
            name="suspect_name"
            value={formData.suspect_name || ''}
            onChange={handleChange}
            placeholder="Name, or 'Unidentified' if unknown"
            disabled={disabled}
          />
          <Input
            label="Alias"
            name="suspect_alias"
            value={formData.suspect_alias || ''}
            onChange={handleChange}
            placeholder="Nickname / alias, if any"
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              name="suspect_age"
              type="number"
              min="0"
              max="130"
              value={formData.suspect_age || ''}
              onChange={handleChange}
              placeholder="e.g., 25"
              disabled={disabled}
            />
            <Select
              label="Sex"
              name="suspect_sex"
              value={formData.suspect_sex || ''}
              onChange={handleChange}
              options={SEX_OPTIONS}
              placeholder="Select sex"
              disabled={disabled}
            />
          </div>
          <Input
            label="Address"
            name="suspect_address"
            value={formData.suspect_address || ''}
            onChange={handleChange}
            placeholder="Last known address, if known"
            disabled={disabled}
          />
          <Textarea
            label="Physical Description"
            name="suspect_physical_description"
            value={formData.suspect_physical_description || ''}
            onChange={handleChange}
            placeholder="Height, build, clothing, distinguishing features"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
          <Select
            label="Status"
            name="suspect_status"
            value={formData.suspect_status || ''}
            onChange={handleChange}
            options={SUSPECT_STATUS_OPTIONS}
            placeholder="Select status"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 5. Incident Details */}
      <section className="section-card">
        <SectionHeading icon={ScrollText} number={5} title="Incident Account" description="The factual account of the incident in chronological order." />
        <div className="space-y-4">
          <Textarea
            label="Incident Summary"
            name="summary"
            value={formData.summary || ''}
            onChange={handleChange}
            placeholder="Brief factual summary of the incident"
            rows={4}
            disabled={disabled}
          />
          <Textarea
            label="Sequence of Events"
            name="sequence_of_events"
            value={formData.sequence_of_events || ''}
            onChange={handleChange}
            placeholder="Chronological sequence: 1) ... 2) ... 3) ..."
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="People Involved"
            name="people_involved"
            value={formData.people_involved || ''}
            onChange={handleChange}
            placeholder="Persons involved and how they relate to the incident"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Actions of Suspect"
            name="actions_of_suspect"
            value={formData.actions_of_suspect || ''}
            onChange={handleChange}
            placeholder="What the suspect did before, during, and after"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Actions of Victim"
            name="actions_of_victim"
            value={formData.actions_of_victim || ''}
            onChange={handleChange}
            placeholder="What the victim did before, during, and after"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Circumstances Before Incident"
            name="circumstances_before_incident"
            value={formData.circumstances_before_incident || ''}
            onChange={handleChange}
            placeholder="Events or conditions leading up to the incident"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Circumstances After Incident"
            name="circumstances_after_incident"
            value={formData.circumstances_after_incident || ''}
            onChange={handleChange}
            placeholder="What happened immediately after the incident"
            rows={3}
            disabled={disabled}
          />
        </div>
      </section>

      {/* §III Facts of the case — the ONE AI-assisted field (stays bound to the
          existing `narrative` field). Accent-bordered card with AI badge. */}
      <section
        className="rounded-xl border-2 border-police-blue-600 bg-white p-5 shadow-sm"
        aria-label="Facts of the case, AI-assisted"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-police-blue-100 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-police-blue-50 text-police-blue-700">
              <ScrollText size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">III. Facts of the case</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">The chronological incident account used in the printed report.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-police-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-police-blue-700">
            <Bot size={11} aria-hidden="true" /> AI-assisted
          </span>
        </div>
        <Textarea
          label="Incident narrative"
          name="narrative"
          value={formData.narrative || ''}
          onChange={handleChange}
          placeholder="Enter the raw incident information and narrative details..."
          rows={10}
          error={errors.narrative}
          disabled={disabled}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-slate-500">AI can draft this section from the AI Report Assistant below. You review every word before saving.</p>
          <button
            type="button"
            onClick={onDraftWithAI}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-police-blue-400 hover:text-police-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bot size={13} aria-hidden="true" /> Draft with AI
          </button>
        </div>
      </section>

      {/* 6. Property / Damage */}
      <section className="section-card">
        <SectionHeading icon={Package} number={6} title="Property / Damage" description="Property involved and the extent of damage or loss." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Property Involved"
            name="property_involved"
            value={formData.property_involved || ''}
            onChange={handleChange}
            placeholder="e.g., Motorcycle, cellular phone"
            disabled={disabled}
          />
          <Input
            label="Quantity"
            name="quantity"
            value={formData.quantity || ''}
            onChange={handleChange}
            placeholder="e.g., 1 unit"
            disabled={disabled}
          />
          <Textarea
            label="Property Description"
            name="property_description"
            value={formData.property_description || ''}
            onChange={handleChange}
            placeholder="Make, model, color, plate/serial number"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
          <Input
            label="Estimated Value"
            name="estimated_value"
            value={formData.estimated_value || ''}
            onChange={handleChange}
            placeholder="e.g., PHP 45,000.00"
            disabled={disabled}
          />
          <Input
            label="Type of Damage"
            name="type_of_damage"
            value={formData.type_of_damage || ''}
            onChange={handleChange}
            placeholder="e.g., Stolen, destroyed, defaced"
            disabled={disabled}
          />
          <Input
            label="Estimated Damage Cost"
            name="estimated_damage_cost"
            value={formData.estimated_damage_cost || ''}
            onChange={handleChange}
            placeholder="e.g., PHP 12,000.00"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 7. Witness Information */}
      <section className="section-card">
        <SectionHeading icon={Eye} number={7} title="Witness Information" description="Persons who witnessed the incident." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Witness Name"
            name="witness_name"
            value={formData.witness_name || ''}
            onChange={handleChange}
            placeholder="First name, middle initial, last name"
            disabled={disabled}
          />
          <Input
            label="Age"
            name="witness_age"
            type="number"
            min="0"
            max="130"
            value={formData.witness_age || ''}
            onChange={handleChange}
            placeholder="e.g., 41"
            disabled={disabled}
          />
          <Input
            label="Address"
            name="witness_address"
            value={formData.witness_address || ''}
            onChange={handleChange}
            placeholder="Residential address"
            disabled={disabled}
          />
          <Input
            label="Contact Number"
            name="witness_contact_number"
            type="tel"
            value={formData.witness_contact_number || ''}
            onChange={handleChange}
            placeholder="e.g., 0920 555 1234"
            disabled={disabled}
          />
          <Textarea
            label="Witness Statement"
            name="witness_statement"
            value={formData.witness_statement || ''}
            onChange={handleChange}
            placeholder="Summary of what the witness saw or knows"
            rows={4}
            disabled={disabled}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* 8. Evidence */}
      <section className="section-card">
        <SectionHeading icon={Gavel} number={8} title="Evidence" description="Evidence, CCTV coverage, and supporting documents." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Evidence Available"
            name="evidence_available"
            value={formData.evidence_available || ''}
            onChange={handleChange}
            options={YES_NO_OPTIONS}
            placeholder="Select"
            disabled={disabled}
          />
          <Input
            label="Evidence Type"
            name="evidence_type"
            value={formData.evidence_type || ''}
            onChange={handleChange}
            placeholder="e.g., Physical, documentary, testimonial"
            disabled={disabled}
          />
          <Textarea
            label="Evidence Description"
            name="evidence_description"
            value={formData.evidence_description || ''}
            onChange={handleChange}
            placeholder="Describe the evidence and its relevance"
            rows={3}
            disabled={disabled}
            className="md:col-span-2"
          />
          <Input
            label="Evidence Location"
            name="evidence_location"
            value={formData.evidence_location || ''}
            onChange={handleChange}
            placeholder="Where the evidence is located / held"
            disabled={disabled}
            className="md:col-span-2"
          />
          <Select
            label="CCTV Available"
            name="cctv_available"
            value={formData.cctv_available || ''}
            onChange={handleChange}
            options={YES_NO_OPTIONS}
            placeholder="Select"
            disabled={disabled}
          />
          <Textarea
            label="CCTV Description"
            name="cctv_description"
            value={formData.cctv_description || ''}
            onChange={handleChange}
            placeholder="Camera location, coverage, and footage details"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
          <Textarea
            label="Attached Documents"
            name="attached_documents"
            value={formData.attached_documents || ''}
            onChange={handleChange}
            placeholder="e.g., Medical certificate, photographs, sketch plan"
            rows={2}
            disabled={disabled}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* 9. Police Action */}
      <section className="section-card">
        <SectionHeading icon={BadgeCheck} number={9} title="Police Action" description="Response, actions taken, and current case status." />
        <div className="space-y-4">
          <Input
            label="Responding Officers"
            name="responding_officers"
            value={formData.responding_officers || ''}
            onChange={handleChange}
            placeholder="e.g., Pat. Reyes, Pat. Santos"
            disabled={disabled}
          />
          <Textarea
            label="Initial Response"
            name="initial_response"
            value={formData.initial_response || ''}
            onChange={handleChange}
            placeholder="How the responding team secured and processed the scene"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Actions Taken"
            name="actions_taken"
            value={formData.actions_taken || ''}
            onChange={handleChange}
            placeholder="Numbered list of police actions taken"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="Evidence Collected"
            name="evidence_collected"
            value={formData.evidence_collected || ''}
            onChange={handleChange}
            placeholder="Items collected and turned over"
            rows={2}
            disabled={disabled}
          />
          <Textarea
            label="Persons Interviewed"
            name="persons_interviewed"
            value={formData.persons_interviewed || ''}
            onChange={handleChange}
            placeholder="Names of persons interviewed"
            rows={2}
            disabled={disabled}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Medical Assistance"
              name="medical_assistance"
              value={formData.medical_assistance || ''}
              onChange={handleChange}
              placeholder="e.g., Brought to hospital / none"
              disabled={disabled}
            />
            <Select
              label="Arrest Made"
              name="arrest_made"
              value={formData.arrest_made || ''}
              onChange={handleChange}
              options={YES_NO_OPTIONS}
              placeholder="Select"
              disabled={disabled}
            />
            <Select
              label="Current Case Status"
              name="current_case_status"
              value={formData.current_case_status || ''}
              onChange={handleChange}
              options={CASE_STATUS_OPTIONS}
              placeholder="Select status"
              disabled={disabled}
            />
          </div>
          <Textarea
            label="Referral / Endorsement"
            name="referral_or_endorsement"
            value={formData.referral_or_endorsement || ''}
            onChange={handleChange}
            placeholder="Referral to prosecutor's office, other units, or agencies"
            rows={2}
            disabled={disabled}
          />
        </div>
      </section>

      {/* 10. Reporting Officer — identity is auto-attached from the officer
          record; only the report date/time are entered here. */}
      <section className="section-card">
        <SectionHeading icon={Users} number={10} title="Reporting Officer" description="The officer who prepared this report. Identity fields come from the officer record." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Officer Name"
            name="officer_name_display"
            value=""
            onChange={() => {}}
            placeholder="Auto — the reporting Officer"
            disabled
          />
          <Input
            label="Officer Rank"
            name="officer_rank_display"
            value={formData.officer_rank || ''}
            onChange={() => {}}
            placeholder="Auto — from officer record"
            disabled
          />
          <Input
            label="Officer Badge Number"
            name="officer_badge_number_display"
            value={formData.badge_number || ''}
            onChange={() => {}}
            placeholder="Auto — from officer record"
            disabled
          />
          <Input
            label="Police Unit"
            name="police_unit_display"
            value={formData.police_unit || ''}
            onChange={() => {}}
            placeholder="Auto — from officer record"
            disabled
          />
          <Input
            label="Report Date"
            name="report_date"
            type="date"
            value={formData.report_date || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Input
            label="Report Time"
            name="report_time"
            type="time"
            value={formData.report_time || ''}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>
      </section>

      {/* Officer-authored sections — muted card. Never AI-drafted. */}
      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
        aria-label="Officer-authored investigation report sections"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
              <PenLine size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">Officer-authored sections</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Sections I, II, IV–VI are always written by the investigating officer.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            <PenLine size={11} aria-hidden="true" /> Not AI-drafted
          </span>
        </div>
        <div className="space-y-4">
          <Textarea
            label="I. Authority"
            name="authority"
            value={formData.authority || ''}
            onChange={handleChange}
            placeholder="e.g., 1. Station Blotter Entry No. ___, dated ___  2. Inherent Police Functions  3. Standard Operating Procedure"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="II. Matters to be Investigated"
            name="matters_investigated"
            value={formData.matters_investigated || ''}
            onChange={handleChange}
            placeholder="Numbered investigative objectives — facts and circumstances, further police action, extent of damages/loss"
            rows={3}
            disabled={disabled}
          />
          <Textarea
            label="IV. Discussion / Evaluation (optional)"
            name="discussion"
            value={formData.discussion || ''}
            onChange={handleChange}
            placeholder="Analysis connecting the facts to the elements of the offense charged"
            rows={4}
            disabled={disabled}
          />
          <Textarea
            label="V. Conclusion"
            name="conclusion"
            value={formData.conclusion || ''}
            onChange={handleChange}
            placeholder="Summary of what the investigation established (who, what, when, where, how)"
            rows={4}
            disabled={disabled}
          />
          <Textarea
            label="VI. Recommendation"
            name="recommendation"
            value={formData.recommendation || ''}
            onChange={handleChange}
            placeholder="Recommended next action — filing of charges, referral to prosecutor's office, further investigation"
            rows={3}
            disabled={disabled}
          />
        </div>
      </section>

      {/* Signatory block */}
      <section className="section-card">
        <SectionHeading icon={PenLine} title="Signatory Block" description="The investigating officer is attached automatically; the approving authority is entered here." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Investigated by"
            name="officer_name_display"
            value=""
            onChange={() => {}}
            placeholder="Auto — the reporting Officer"
            disabled
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Approving authority"
              name="approving_authority_name"
              value={formData.approving_authority_name || ''}
              onChange={handleChange}
              placeholder="Chief of Police / Officer-in-Charge name"
              disabled={disabled}
            />
            <Input
              label="Rank"
              name="approving_authority_rank"
              value={formData.approving_authority_rank || ''}
              onChange={handleChange}
              placeholder="e.g., PCOL"
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
