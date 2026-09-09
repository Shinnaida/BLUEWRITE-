// BLUEWRITE — Officer CreateReportPage (Summary-First Redesign)
// Summary-led layout: the live report summary is the MAIN panel and the guided
// Q&A assistant sits in a collapsible side panel (desktop). On mobile/tablet
// the assistant stays fullscreen and the summary is a bottom sheet, as before.
// Non-negotiables preserved: formData shape, validate(isSubmit), debounced localStorage
// draft autosave ("bluewrite:create-draft"), ConfirmDialog submit gate, beforeunload
// warning, AI safety patterns (writingIntentPattern / unsafeWritingPattern) gating every
// AI interaction (writing presets + custom writing instructions), and unchanged
// POST /api/reports + PATCH /api/reports/:id/submit payloads via reportService.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/Modal';
import { INCIDENT_TYPE_OPTIONS } from '../../utils/constants';
import Toast from '../../components/common/Toast';
import { createReport, submitReport } from '../../services/reportService';
import { requestReportAssistance, extractReportFields } from '../../services/aiService';
import AIReportChat from '../../components/ai/AIReportChat';
import PrintableReport from '../../components/reports/PrintableReport';
import { recordReportPrint } from '../../services/reportService';
import TimePicker from '../../components/common/TimePicker';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import {
  Send, Bot, User, AlertTriangle, CheckCircle2, X, PenLine, FileText,
} from 'lucide-react';
import { fieldsForIncidentType, TYPE_LABELS } from '../../utils/incidentTypeFields';

const FIELD_ORDER = [
  'incident_type', 'location', 'incident_date', 'incident_time',
  'complainant', 'victim', 'suspect', 'witness', 'summary', 'narrative',
];

const FIELD_LABELS = {
  incident_type: 'Incident Type',
  location: 'Location',
  incident_date: 'Incident Date',
  incident_time: 'Incident Time',
  complainant: 'Complainant',
  victim: 'Victim',
  suspect: 'Suspect',
  witness: 'Witness',
  summary: 'Summary',
  narrative: 'Narrative',
  // PNP memorandum-style Investigation Report fields (header + body sections)
  station_name: 'Station Name',
  station_region: 'Regional Office',
  station_address: 'Station Address',
  station_email: 'Station Email',
  station_contact: 'Station Contact No.',
  recipient_office: 'Memo Recipient (FOR)',
  authority: 'I. Authority',
  matters_investigated: 'II. Matters to be Investigated',
  discussion: 'IV. Discussion / Evaluation',
  conclusion: 'V. Conclusion',
  recommendation: 'VI. Recommendation',
  approving_authority_name: 'Approving Authority (Name)',
  approving_authority_rank: 'Approving Authority (Rank)',
  // Structured incident report detail fields (10-section spec)
  date_reported: 'Date Reported',
  time_reported: 'Time Reported',
  barangay: 'Barangay',
  city: 'City / Municipality',
  province: 'Province',
  specific_place: 'Specific Place',
  blotter_entry_no: 'Blotter Entry No.',
  complainant_full_name: 'Complainant Name',
  complainant_age: 'Complainant Age',
  complainant_sex: 'Complainant Sex',
  complainant_address: 'Complainant Address',
  complainant_contact_number: 'Complainant Contact No.',
  complainant_role: 'Complainant Role',
  victim_full_name: 'Victim Name',
  victim_age: 'Victim Age',
  victim_sex: 'Victim Sex',
  victim_address: 'Victim Address',
  victim_contact_number: 'Victim Contact No.',
  victim_injuries: 'Victim Injuries',
  victim_damage_or_loss: 'Victim Damage / Loss',
  suspect_name: 'Suspect Name',
  suspect_alias: 'Suspect Alias',
  suspect_age: 'Suspect Age',
  suspect_sex: 'Suspect Sex',
  suspect_address: 'Suspect Address',
  suspect_physical_description: 'Suspect Description',
  suspect_status: 'Suspect Status',
  people_involved: 'People Involved',
  sequence_of_events: 'Sequence of Events',
  actions_of_suspect: 'Actions of Suspect',
  actions_of_victim: 'Actions of Victim',
  circumstances_before_incident: 'Circumstances Before',
  circumstances_after_incident: 'Circumstances After',
  property_involved: 'Property Involved',
  property_description: 'Property Description',
  quantity: 'Quantity',
  estimated_value: 'Estimated Value',
  type_of_damage: 'Type of Damage',
  estimated_damage_cost: 'Estimated Damage Cost',
  witness_name: 'Witness Name',
  witness_age: 'Witness Age',
  witness_address: 'Witness Address',
  witness_contact_number: 'Witness Contact No.',
  witness_statement: 'Witness Statement',
  evidence_available: 'Evidence Available',
  evidence_type: 'Evidence Type',
  evidence_description: 'Evidence Description',
  evidence_location: 'Evidence Location',
  cctv_available: 'CCTV Available',
  cctv_description: 'CCTV Description',
  attached_documents: 'Attached Documents',
  responding_officers: 'Responding Officers',
  initial_response: 'Initial Response',
  actions_taken: 'Actions Taken',
  evidence_collected: 'Evidence Collected',
  persons_interviewed: 'Persons Interviewed',
  medical_assistance: 'Medical Assistance',
  arrest_made: 'Arrest Made',
  referral_or_endorsement: 'Referral / Endorsement',
  current_case_status: 'Case Status',
  report_date: 'Report Date',
  report_time: 'Report Time',
};

const FIELD_PLACEHOLDERS = {
  incident_type: 'Select type',
  location: 'Incident location',
  incident_date: 'YYYY-MM-DD',
  incident_time: 'HH:MM',
  complainant: 'Name of complainant',
  victim: 'Name of victim',
  suspect: 'Name of suspect',
  witness: 'Name of witness',
  summary: 'Brief factual summary',
  narrative: 'Briefly describe what happened, including important actions and events.',
  station_name: 'e.g., Quezon City Police Station',
  station_region: 'e.g., PRO NCR',
  station_address: 'City/Municipality, Province, ZIP',
  station_email: 'station@example.gov.ph',
  station_contact: 'Tel. Nr.',
  recipient_office: 'e.g., Officer in Charge, Provincial Office',
  authority: '1. Station Blotter Entry No. ___, dated ___  2. Inherent Police Functions  3. Standard Operating Procedure',
  matters_investigated: 'Numbered investigative objectives',
  discussion: 'Analysis connecting the facts to the elements of the offense charged',
  conclusion: 'What the investigation established (who, what, when, where, how)',
  recommendation: 'Filing of charges, referral to prosecutor\'s office, further investigation',
  approving_authority_name: 'Chief of Police / Officer-in-Charge name',
  approving_authority_rank: 'e.g., PCOL',
  // Structured detail fields
  date_reported: 'YYYY-MM-DD',
  time_reported: 'HH:MM',
  barangay: 'e.g., Brgy. San Isidro',
  city: 'e.g., Quezon City',
  province: 'e.g., Metro Manila',
  specific_place: 'e.g., in front of No. 12 Rizal St.',
  blotter_entry_no: 'e.g., 2023-0512',
  complainant_full_name: 'First name, middle initial, last name',
  complainant_age: 'e.g., 34',
  complainant_sex: 'Select sex',
  complainant_address: 'Residential address',
  complainant_contact_number: 'e.g., 0917 123 4567',
  complainant_role: "e.g., Victim's spouse, eyewitness",
  victim_full_name: 'First name, middle initial, last name',
  victim_age: 'e.g., 28',
  victim_sex: 'Select sex',
  victim_address: 'Residential address',
  victim_contact_number: 'e.g., 0918 765 4321',
  victim_role: 'e.g., Store owner, victim\'s spouse',
  victim_injuries: "Injuries or loss sustained, or 'none'",
  victim_damage_or_loss: 'Damage to property or items lost',
  suspect_name: "Name, or 'Unidentified' if unknown",
  suspect_alias: 'Nickname / alias, if any',
  suspect_age: 'e.g., 25',
  suspect_sex: 'Select sex',
  suspect_address: 'Last known address, if known',
  suspect_physical_description: 'Height, build, clothing, distinguishing features',
  suspect_status: 'Select status',
  people_involved: 'Names and roles in this incident',
  sequence_of_events: '1) … 2) … 3) …',
  actions_of_suspect: "Suspect's actions before, during, after",
  actions_of_victim: "Victim's actions before, during, after",
  circumstances_before_incident: 'Conditions leading up to it',
  circumstances_after_incident: 'Immediately after the incident',
  property_involved: 'e.g., Motorcycle, cellular phone',
  property_description: 'Make, model, color, plate/serial number',
  quantity: 'e.g., 1 unit',
  estimated_value: 'e.g., PHP 45,000.00',
  type_of_damage: 'e.g., Stolen, destroyed, defaced',
  estimated_damage_cost: 'e.g., PHP 12,000.00',
  witness_name: 'First name, middle initial, last name',
  witness_age: 'e.g., 41',
  witness_address: 'Residential address',
  witness_contact_number: 'e.g., 0920 555 1234',
  witness_statement: 'Summary of what the witness saw or knows',
  evidence_available: 'Select',
  evidence_type: 'e.g., Physical, documentary, testimonial',
  evidence_description: 'Describe the evidence and its relevance',
  evidence_location: 'Where the evidence is located / held',
  cctv_available: 'Select',
  cctv_description: 'Camera location, coverage, and footage details',
  attached_documents: 'e.g., Medical certificate, photographs, sketch plan',
  responding_officers: 'e.g., Pat. Reyes, Pat. Santos',
  initial_response: 'How the responding team secured and processed the scene',
  actions_taken: 'Numbered list of police actions taken',
  evidence_collected: 'Items collected and turned over',
  persons_interviewed: 'Names of persons interviewed',
  medical_assistance: 'e.g., Brought to hospital / none',
  arrest_made: 'Select',
  referral_or_endorsement: "Referral to prosecutor's office, other units, or agencies",
  current_case_status: 'Select status',
  report_date: 'YYYY-MM-DD',
  report_time: 'HH:MM',
};

const REQUIRED_FIELDS = ['incident_type', 'location', 'incident_date', 'incident_time'];

// Summary sections: groups the click-to-edit cards so the main panel reads like
// a structured report instead of one long stack. `full` fields span the grid width.
// §III Facts of the case is the ONE AI-assisted narrative field. It stays bound
// to the existing `narrative` field (invariant #4).
const FACTS_FIELD = 'narrative';

const SUMMARY_SECTIONS = [
  {
    title: 'Incident Information',
    formal: 'Section 1 · Incident Information',
    description: 'Required — when and where the incident occurred.',
    fields: ['incident_type', 'incident_date', 'incident_time', 'location', 'specific_place', 'blotter_entry_no'],
  },
  {
    title: 'Type-Specific Details',
    description: 'Only the fields relevant to the selected incident type.',
    fields: [],
  },
  {
    title: 'Complainant',
    formal: 'Section 2 · Complainant',
    description: 'Optional — the person who reported the incident.',
    fields: ['complainant_full_name', 'complainant_role', 'complainant_address'],
  },
  {
    title: 'Victim / Property Owner',
    formal: 'Section 3 · Victim / Property Owner',
    description: 'Optional — the person against whom the offense was committed.',
    fields: ['victim_full_name', 'victim_role', 'victim_injuries'],
  },
  {
    title: 'Suspect',
    formal: 'Section 4 · Suspect',
    description: 'Optional — the person suspected of committing the offense.',
    fields: ['suspect_name', 'suspect_status', 'suspect_address', 'suspect_physical_description'],
  },
  {
    title: 'What Happened',
    formal: 'Section 5 · What Happened',
    description: 'Describe the incident in your own words — the AI turns it into formal report language.',
    fields: [FACTS_FIELD],
  },
  {
    title: 'Evidence & Witnesses',
    formal: 'Section 6 · Evidence & Witnesses',
    description: 'Optional — evidence available and persons who witnessed the incident.',
    fields: ['evidence_type', 'evidence_description', 'witness_name', 'witness_statement'],
  },
  {
    title: 'Police Action',
    formal: 'Section 7 · Police Action',
    description: 'Optional — who responded, what was done, and where the case stands.',
    fields: ['responding_officers', 'actions_taken', 'current_case_status'],
  },
  {
    title: 'Reporting Officer',
    formal: 'Section 8 · Reporting Officer',
    description: 'Investigator identity is auto-attached from the officer record; enter the approving authority.',
    fields: ['approving_authority_name', 'approving_authority_rank'],
  },
  {
    title: 'Investigation Report Sections',
    description: 'Generated by AI from your inputs — review and edit before submitting.',
    fields: ['authority', 'matters_investigated', 'discussion', 'conclusion', 'recommendation'],
  },
];

// §III Facts of the case is the ONE AI-assisted narrative field. It stays bound
// to the existing `narrative` field (invariant #4) — only its grouping changes.
// (Declared before SUMMARY_SECTIONS, which references it for Section 5.)
const OFFICER_AUTHORED_SECTIONS = [
  { label: 'I. Authority', field: 'authority', rows: 3 },
  { label: 'II. Matters to be investigated', field: 'matters_investigated', rows: 3 },
  { label: 'IV. Discussion / Evaluation (optional)', field: 'discussion', rows: 4 },
  { label: 'V. Conclusion', field: 'conclusion', rows: 4 },
  { label: 'VI. Recommendation', field: 'recommendation', rows: 3 },
];

const FULL_WIDTH_FIELDS = new Set([
  'summary', 'narrative',
  // PNP body sections read better full-width
  'authority', 'matters_investigated', 'discussion', 'conclusion', 'recommendation',
  // Structured detail text fields
  'complainant_address', 'victim_address', 'suspect_address', 'witness_address',
  'victim_injuries', 'victim_damage_or_loss', 'suspect_physical_description',
  'people_involved', 'sequence_of_events', 'actions_of_suspect',
  'actions_of_victim', 'circumstances_before_incident', 'circumstances_after_incident',
  'property_description', 'witness_statement', 'evidence_description', 'evidence_location',
  'cctv_description', 'attached_documents', 'initial_response', 'actions_taken',
  'evidence_collected', 'persons_interviewed', 'referral_or_endorsement',
]);

// Multi-line PNP body sections get textareas in the summary cards (same
// behavior as summary/narrative; Enter inserts a line break instead of commit).
const TEXTAREA_FIELDS = new Set([
  'summary', 'narrative',
  'authority', 'matters_investigated', 'discussion', 'conclusion', 'recommendation',
  // Structured detail text fields
  'victim_injuries', 'victim_damage_or_loss', 'suspect_physical_description',
  'people_involved', 'sequence_of_events', 'actions_of_suspect',
  'actions_of_victim', 'circumstances_before_incident', 'circumstances_after_incident',
  'property_description', 'witness_statement', 'evidence_description',
  'cctv_description', 'attached_documents', 'initial_response', 'actions_taken',
  'evidence_collected', 'persons_interviewed', 'referral_or_endorsement',
]);

// Input type overrides for structured detail fields (default is a text input).
const FIELD_INPUT_TYPES = {
  complainant_age: 'number', victim_age: 'number', suspect_age: 'number', witness_age: 'number',
  complainant_contact_number: 'tel', victim_contact_number: 'tel', suspect_address: 'text', witness_contact_number: 'tel',
  date_reported: 'date', time_reported: 'time', report_date: 'date', report_time: 'time',
};

// Dropdown options for structured detail fields rendered as selects.
const SEX_SELECT_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];
const YES_NO_SELECT_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];
const FIELD_SELECT_OPTIONS = {
  complainant_sex: SEX_SELECT_OPTIONS,
  victim_sex: SEX_SELECT_OPTIONS,
  suspect_sex: SEX_SELECT_OPTIONS,
  suspect_status: [
    { value: 'At Large', label: 'At Large' },
    { value: 'Arrested', label: 'Arrested' },
    { value: 'Identified', label: 'Identified' },
    { value: 'Unknown', label: 'Unknown' },
  ],
  evidence_available: YES_NO_SELECT_OPTIONS,
  cctv_available: YES_NO_SELECT_OPTIONS,
  arrest_made: YES_NO_SELECT_OPTIONS,
  current_case_status: [
    { value: 'Under Investigation', label: 'Under Investigation' },
    { value: 'Cleared', label: 'Cleared' },
    { value: 'Referred to Prosecutor', label: 'Referred to Prosecutor' },
    { value: 'Closed', label: 'Closed' },
  ],
};

const INITIAL_QUESTIONS = [
  { field: 'incident_type', text: "I'll help you create an incident report. Let's start with the basics — what type of incident is this?" },
  { field: 'location', text: 'Where did it happen?' },
  { field: 'incident_date', text: 'When did it happen? (Date)' },
  { field: 'incident_time', text: 'What time? (24-hour format)' },
  { field: 'people', text: "Who's involved? Mention any that apply — complainant, victim, suspect, witness." },
  { field: 'summary', text: 'Give me a 1–2 sentence factual summary.' },
  { field: 'narrative', text: 'Now provide the full narrative with all details.' },
];

const PEOPLE_FIELDS = ['complainant', 'victim', 'suspect', 'witness'];

// Exact word/phrase → incident type, used by the deterministic fast path only.
const INCIDENT_TYPE_KEYWORDS_EXACT = {
  theft: 'theft',
  assault: 'assault',
  burglary: 'burglary',
  traffic: 'traffic',
  vandalism: 'vandalism',
  disturbance: 'disturbance',
  fraud: 'fraud',
  other: 'other',
};

const INCIDENT_TYPE_KEYWORDS = {
  theft: ['theft', 'stolen', 'steal', 'shoplifting', 'robbery'],
  assault: ['assault', 'attack', 'punched', 'beaten', 'violence'],
  burglary: ['burglary', 'break.in', 'broke in', 'breaking and entering'],
  traffic: ['traffic', 'accident', 'crash', 'collision', 'vehicle', 'car', 'hit and run'],
  vandalism: ['vandalism', 'graffiti', 'defaced'],
  disturbance: ['disturbance', 'noise', 'fight', 'argument', 'dispute', 'domestic'],
  fraud: ['fraud', 'scam', 'fake', 'identity theft', 'forgery'],
  other: ['other'],
};

function extractIncidentType(text) {
  const lower = String(text || '').toLowerCase().trim();
  // Exact fixed-option resolution first (free-text equivalent of a chip click)
  const exact = INCIDENT_TYPE_OPTIONS.find(
    (o) => lower === o.value || lower === o.label.toLowerCase()
  );
  if (exact) return exact.value;
  // Multi-select: collect every type whose keywords appear in the message
  // (e.g. "theft and vandalism") and store as a comma-separated list.
  const matched = [];
  for (const [type, keywords] of Object.entries(INCIDENT_TYPE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k)) && !matched.includes(type)) matched.push(type);
  }
  return matched.length ? matched.join(',') : null;
}

function extractDate(text) {
  const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/;
  const match = text.match(dateRegex);
  if (match) {
    const raw = match[0];
    const parts = raw.split(/[\/\-]/);
    if (parts[0].length === 4) return raw;
    if (parts.length === 3) {
      const [m, d, y] = parts;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return raw;
  }
  const lower = text.toLowerCase();
  const today = new Date();
  if (lower.includes('today')) return today.toISOString().split('T')[0];
  if (lower.includes('yesterday')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  return null;
}

function extractTime(text) {
  const timeRegex = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i;
  const match = text.match(timeRegex);
  if (match) {
    let [, h, m, ampm] = match;
    h = parseInt(h, 10);
    if (ampm) {
      const ap = ampm.toLowerCase();
      if (ap === 'pm' && h !== 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
    }
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  const military = text.match(/\b(\d{1,2})(\d{2})\b/);
  if (military) {
    const h = parseInt(military[1], 10);
    const m = military[2];
    if (h >= 0 && h <= 23 && parseInt(m, 10) < 60) {
      return `${h.toString().padStart(2, '0')}:${m}`;
    }
  }
  return null;
}

function extractPeople(text) {
  const people = {};
  const patterns = {
    complainant: /complainant[:\s]+([^,.;]+)/i,
    victim: /victim[:\s]+([^,.;]+)/i,
    suspect: /suspect[:\s]+([^,.;]+)/i,
    witness: /witness[:\s]+([^,.;]+)/i,
  };
  for (const [field, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match && match[1].trim()) people[field] = match[1].trim();
  }
  return people;
}

function extractSummary(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length >= 1) return `${sentences.slice(0, 2).join('. ').trim()}.`;
  return text.trim().length > 15 ? text.trim() : null;
}

function extractNarrative(text) {
  return text.trim().length >= 20 ? text.trim() : null;
}

// Local guided-Q&A extraction. This is NOT an AI call, so the writing-request
// safety patterns deliberately do not apply here; they gate every real AI
// interaction (writing presets and custom writing instructions) below.
function mockExtractFields(userMessage, currentQuestionField, formData) {
  const extracted = {};

  if (currentQuestionField === 'incident_type' || !formData.incident_type) {
    const type = extractIncidentType(userMessage);
    if (type) extracted.incident_type = type;
  }

  if (currentQuestionField === 'location' || !formData.location) {
    // A short bare answer (e.g. "naga", "main st") while the location question is
    // active is the location itself — don't require an "at ..." pattern.
    if (currentQuestionField === 'location' && userMessage.trim().length >= 2 && userMessage.trim().length <= 60 && !/\?/.test(userMessage)) {
      extracted.location = userMessage.trim().replace(/^(at|in|near|sa)\s+/i, '');
    } else {
      const locationPatterns = [
        /at\s+([^,.]+)/i,
        /location[:\s]+([^,.]+)/i,
        /happened\s+(?:at\s+)?([^,.]+)/i,
        /occurred\s+(?:at\s+)?([^,.]+)/i,
      ];
      for (const pattern of locationPatterns) {
        const match = userMessage.match(pattern);
        if (match && match[1].trim().length > 2) {
          extracted.location = match[1].trim();
          break;
        }
      }
    }
  }

  if (currentQuestionField === 'incident_date' || !formData.incident_date) {
    const date = extractDate(userMessage);
    if (date) extracted.incident_date = date;
  }

  if (currentQuestionField === 'incident_time' || !formData.incident_time) {
    const time = extractTime(userMessage);
    if (time) extracted.incident_time = time;
  }

  if (currentQuestionField === 'people') {
    Object.assign(extracted, extractPeople(userMessage));
  }

  if (currentQuestionField === 'summary' || !formData.summary) {
    const summary = extractSummary(userMessage);
    if (summary) extracted.summary = summary;
  }

  if (currentQuestionField === 'narrative' || !formData.narrative) {
    const narrative = extractNarrative(userMessage);
    if (narrative) extracted.narrative = narrative;
  }

  return extracted;
}

function getNextQuestionIndex(currentIndex, formData, extractedFields) {
  let nextIndex = currentIndex + 1;
  while (nextIndex < INITIAL_QUESTIONS.length) {
    const q = INITIAL_QUESTIONS[nextIndex];
    if (q.field === 'people') {
      const hasAnyPeople = PEOPLE_FIELDS.some((f) => formData[f] || extractedFields[f]);
      if (!hasAnyPeople) break;
    } else if (!formData[q.field] && !extractedFields[q.field]) {
      break;
    }
    nextIndex++;
  }
  return nextIndex;
}

function getFollowUpQuestion(currentField) {
  switch (currentField) {
    case 'incident_type':
      return 'What type of incident? For example: theft, assault, burglary, traffic, vandalism, disturbance, fraud, or other.';
    case 'location':
      return 'Where did this happen? Please provide the address, intersection, or landmark.';
    case 'incident_date':
      return "What date did it happen? Use YYYY-MM-DD format, or say 'today' or 'yesterday'.";
    case 'incident_time':
      return 'What time? Use 24-hour format (e.g., 14:30) or 12-hour with am/pm (e.g., 2:30 pm).';
    case 'people':
      return 'Who was involved? You can mention complainant, victim, suspect, and/or witness names.';
    case 'summary':
      return 'Give me a brief 1–2 sentence factual summary of what happened.';
    case 'narrative':
      return 'Now provide the full narrative with all details you recall.';
    default:
      return null;
  }
}

function isAnswerSufficient(currentField, extractedFields, userMessage, formData) {
  if (currentField === 'people') {
    return PEOPLE_FIELDS.some((f) => formData[f] || extractedFields[f]) || userMessage.trim().length > 0;
  }
  if (currentField === 'narrative') {
    return (extractedFields.narrative || userMessage.trim()).length >= 20;
  }
  if (currentField === 'summary') {
    return Boolean(extractedFields.summary) || userMessage.trim().length > 15;
  }
  return Boolean(extractedFields[currentField]);
}

// AI safety validation — UNCHANGED patterns from the existing implementation.
function validateWritingRequest(value) {
  const request = String(value || '').trim();
  if (!request) return { valid: true, message: 'No custom instruction entered. Selected presets and default writing safeguards will apply.' };

  const writingIntentPattern = /\b(concise|shorter|longer|brief|length|summari[sz]e|grammar|grammatical|spelling|punctuation|sentence|paragraph|clear|clearer|clarity|wording|rewrite|rephrase|revise|edit|improve|chronolog(?:y|ical)|sequence|timeline|order|transition|tone|neutral|objective|professional|formal|organi[sz]e|organization|structure|format|narrative|report|repetition|repetitive|duplicate|redundant|unclear|review|verify)\b/i;
  const unsafeWritingPattern = /\b(joke|poem|song|weather|recipe|game|sports|politics|guilty|innocent|convict|legal advice|investigative decision)\b|\b(ignore|bypass|override|disregard)\b.{0,40}\b(rule|instruction|policy|safety)\b|\b(invent|fabricate|make up|add|adding)\b.{0,45}\b(fact|evidence|suspect|witness|confession|statement|action|actions|injury|weapon)\b|\b(change|alter|replace)\b.{0,35}\b(date|time|name|location|fact|evidence)\b/i;

  const WRITING_REQUEST_REFUSAL = 'This assistant supports incident-report writing only. Enter a request about clarity, grammar, chronology, tone, organization, length, repetition, or details to verify. It cannot invent facts, make investigative decisions, determine guilt, or provide unrelated content.';

  if (unsafeWritingPattern.test(request) || !writingIntentPattern.test(request)) return { valid: false, message: WRITING_REQUEST_REFUSAL };
  return { valid: true, message: 'Writing request ready. Choose a writing improvement preset or continue.' };
}

const WRITING_PRESETS = [
  { key: 'concise', label: 'Make more concise' },
  { key: 'clarity', label: 'Improve grammar & clarity' },
  { key: 'chronology', label: 'Improve chronological order' },
  { key: 'neutral', label: 'Use neutral wording' },
  { key: 'verify', label: 'Identify details to verify' },
  { key: 'repetition', label: 'Remove repetition' },
];

function CreateReportPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [formMessage, setFormMessage] = React.useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [localDraftFound, setLocalDraftFound] = React.useState(false);
  const [saveState, setSaveState] = React.useState('');
  const [toast, setToast] = React.useState({ message: '', type: 'info' });

  // Assistant popover (FAB-triggered): hidden by default. Opening/closing it
  // NEVER calls the AI — the greeting is a static string and AI requests fire
  // only when the officer sends a message. One-time conversation flag below is
  // persisted with the draft so reopening never re-initializes the thread.
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [hasGreeted, setHasGreeted] = React.useState(false);
  const chatScrollRef = React.useRef(null);

  // Chat state
  const [messages, setMessages] = React.useState([
    { role: 'assistant', content: INITIAL_QUESTIONS[0].text, questionIndex: 0 },
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [isAiThinking, setIsAiThinking] = React.useState(false);
  const [composerValue, setComposerValue] = React.useState('');
  const [reportId, setReportId] = React.useState(null);
  const [pendingPreset, setPendingPreset] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  // Pending AI report draft from the AIReportChat preview (registered via
  // onRegisterApply). Included automatically when the officer saves/submits —
  // the same mechanism the Edit page uses — and blocks submit while unresolved
  // factual findings remain (reviewReady === false).
  const getPendingAIDraft = React.useRef(null);
  const [pendingAIDraft, setPendingAIDraft] = React.useState(null);
  // Post-submit overlay: the finished PNP-formatted document over the page,
  // with Print. Shown only after submitReport succeeds; close → view page.
  const [submittedReport, setSubmittedReport] = React.useState(null);
  // Quota cooldown: after a rate-limit rejection, suppress further AI attempts for
  // 60s so the officer isn't spammed with errors and the API isn't hammered.
  const [aiCooldownUntil, setAiCooldownUntil] = React.useState(0);
  const isAiCoolingDown = Date.now() < aiCooldownUntil;

  const hasAnyData = Object.keys(formData).length > 0;

  // ── Draft found banner ─────────────────────────────────────────────
  React.useEffect(() => {
    setLocalDraftFound(Boolean(window.localStorage.getItem('bluewrite:create-draft')));
  }, []);

  // ── Debounced localStorage draft autosave — now an envelope carrying the
  //    form fields PLUS the assistant conversation (messages, question index,
  //    hasGreeted) so restoring a draft restores the conversation with it. ──
  React.useEffect(() => {
    if (!Object.keys(formData).length) return undefined;
    setSaveState('Saving draft locally...');
    const timer = window.setTimeout(() => {
      window.localStorage.setItem('bluewrite:create-draft', JSON.stringify({
        fields: formData,
        assistant: { messages, currentQuestionIndex, hasGreeted },
      }));
      setSaveState(`Draft saved locally at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [formData, messages, currentQuestionIndex, hasGreeted]);

  // ── beforeunload warning (unchanged) ───────────────────────────────
  React.useEffect(() => {
    const warn = (event) => {
      if (Object.keys(formData).length) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formData]);

  // ── Keep the question index in sync with formData (panel edits count too) ──
  React.useEffect(() => {
    if (!Object.keys(formData).length) return;
    let idx = 0;
    for (const q of INITIAL_QUESTIONS) {
      if (q.field === 'people') {
        const hasAny = PEOPLE_FIELDS.some((f) => formData[f]);
        if (!hasAny) break;
      } else if (!formData[q.field]) {
        break;
      }
      idx++;
    }
    const targetIndex = Math.min(idx, INITIAL_QUESTIONS.length - 1);
    setCurrentQuestionIndex((prev) => (prev === targetIndex ? prev : targetIndex));
  }, [formData]);

  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isAiThinking]);

  const restoreDraft = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem('bluewrite:create-draft'));
      // Envelope shape (fields + assistant conversation) since the floating
      // assistant; older drafts are the flat formData object.
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.assistant?.messages) && parsed.assistant.messages.length) {
        setFormData(parsed.fields || {});
        setMessages(parsed.assistant.messages);
        setCurrentQuestionIndex(parsed.assistant.currentQuestionIndex || 0);
        setHasGreeted(Boolean(parsed.assistant.hasGreeted));
      } else {
        setFormData(parsed || {});
      }
      setLocalDraftFound(false);
      setToast({ message: 'Local draft restored.', type: 'success' });
    } catch {
      setLocalDraftFound(false);
    }
  };

  const discardDraft = () => {
    window.localStorage.removeItem('bluewrite:create-draft');
    setLocalDraftFound(false);
  };

  // ── validate(isSubmit) — logic unchanged ───────────────────────────
  const validate = (isSubmit) => {
    const nextErrors = {};
    if (isSubmit || formData.incident_type) if (!formData.incident_type?.trim()) nextErrors.incident_type = 'Incident type is required.';
    if (isSubmit || formData.incident_date) if (!formData.incident_date?.trim()) nextErrors.incident_date = 'Incident date is required.';
    if (isSubmit || formData.incident_time) if (!formData.incident_time?.trim()) nextErrors.incident_time = 'Incident time is required.';
    if (isSubmit || formData.location) if (!formData.location?.trim()) nextErrors.location = 'Incident location is required.';
    if (isSubmit && (!formData.narrative || formData.narrative.trim().length < 30)) nextErrors.narrative = 'Narrative must be at least 30 characters.';
    setErrors(nextErrors);
    setFormMessage(Object.keys(nextErrors).length ? 'Please correct the highlighted fields before continuing.' : '');
    return Object.keys(nextErrors).length === 0;
  };

  // ── Redundancy guard: the guided chat's role-name fields (complainant,
  // victim, suspect, witness) are derived from the full party sections at
  // save/submit/AI time — never asked for twice. A name filled in
  // "Complainant Information" IS the complainant; the officer never re-types it.
  const withDerivedRoles = (base) => {
    const derived = { ...base };
    const roleMap = [
      ['complainant', 'complainant_full_name'],
      ['victim', 'victim_full_name'],
      ['suspect', 'suspect_name'],
      ['witness', 'witness_name'],
    ];
    for (const [role, detailField] of roleMap) {
      if (!String(derived[role] || '').trim() && String(derived[detailField] || '').trim()) {
        derived[role] = String(derived[detailField]).trim();
      }
    }
    return derived;
  };

  const saveDraft = async () => {
    if (!validate(false)) return;
    try {
      const payload = withDerivedRoles({ ...formData, ...(getPendingAIDraft.current?.() || {}) });
      const r = await createReport(payload);
      window.localStorage.removeItem('bluewrite:create-draft');
      navigate(`/officer/reports/${r.data.data.id}/edit`);
    } catch (e) {
      setFormMessage(e.response?.data?.message || 'Unable to save report.');
    }
  };

  const requestSubmit = () => {
    if (validate(true)) setShowSubmitConfirm(true);
  };

  // ── Generate Report: the AIReportChat panel below handles the full
  // generate → preview → verify → apply flow (same component as the Edit
  // page). Its validated draft lands here via onInsertSuggestion and, while a
  // preview is open, via the registered apply-getter on Save/Submit. ──

  // Single completeness check — reused by the Submit button AND the Generate
  // Report gate (Step 3). Never write a second, parallel check.
  const completeness = React.useMemo(() => {
    const missing = REQUIRED_FIELDS.filter((field) => !(formData[field] || '').trim());
    const merged = { ...formData, ...(pendingAIDraft || {}) };
    const narrativeShort = !merged.narrative || merged.narrative.trim().length < 30;
    const labels = { incident_type: 'incident type', location: 'location', incident_date: 'incident date', incident_time: 'incident time' };
    const missingLabels = missing.map((field) => labels[field] || field);
    if (narrativeShort) missingLabels.push('a 30+ character narrative');
    return { ready: missing.length === 0 && !narrativeShort, missingLabels, narrativeShort };
  }, [formData, pendingAIDraft]);
  const isSubmitReady = completeness.ready;

  // ── Chat send: chip clicks and composer both route here ───────────
  async function handleSendMessage(rawText) {
    const userMessage = String(rawText ?? composerValue).trim();
    if (!userMessage || isAiThinking) return;

    const activePreset = pendingPreset;
    const currentQuestion = INITIAL_QUESTIONS[currentQuestionIndex];

    setComposerValue('');
    setPendingPreset(null);
    setIsAiThinking(true);
    // Always post the officer's message first so the thread shows what they said.
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // ── Writing preset click → REAL AI via requestReportAssistance ──
    if (activePreset) {
      handleAIWritingRequest(activePreset.key, userMessage);
      return;
    }

    // ── After the narrative is captured, free-text = writing instruction.
    //    Safety-gated: blocked requests are refused in-thread (never a modal). ──
    if (formData.narrative && (!currentQuestion || currentQuestion.field !== 'narrative' || formData.narrative.trim().length >= 20)) {
      const validation = validateWritingRequest(userMessage);
      if (!validation.valid) {
        setMessages((prev) => [...prev, { role: 'assistant', content: validation.message }]);
        setIsAiThinking(false);
        return;
      }
      handleAIWritingRequest(null, userMessage);
      return;
    }

    // ── Guided Q&A: fast-path exact answers skip the AI call entirely ──
    const fastFields = fastPathExtract(userMessage);
    if (Object.keys(fastFields).length > 0) {
      applyExtractedFields(fastFields, currentQuestion);
      return;
    }

    // ── Guided Q&A: AI extraction with local fallback; fields fill directly ──
    if (isAiCoolingDown) {
      const fallback = mockExtractFields(userMessage, currentQuestion.field, formData);
      if (Object.keys(fallback).length > 0) {
        applyExtractedFields(fallback, currentQuestion);
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "The AI service is cooling down after reaching its usage limit, and I couldn't parse that answer locally. Please try again in about a minute, or fill the field directly in the summary panel.",
        }]);
        setIsAiThinking(false);
      }
      return;
    }

    try {
      const response = await extractReportFields({
        message: userMessage,
        knownFields: withDerivedRoles(formData),
        currentDate: new Date().toISOString().split('T')[0],
        currentQuestionField: currentQuestion?.field || null,
      });
      const extracted = response.data?.data?.extracted || {};
      if (Object.keys(extracted).length > 0) {
        applyExtractedFields(extracted, currentQuestion);
      } else {
        const fallback = mockExtractFields(userMessage, currentQuestion.field, formData);
        if (Object.keys(fallback).length > 0) {
          applyExtractedFields(fallback, currentQuestion);
        } else {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: getFollowUpQuestion(currentQuestion.field),
            questionIndex: currentQuestionIndex,
          }]);
          setIsAiThinking(false);
        }
      }
    } catch (e) {
      // AI unavailable/rate-limited → fall back to local parsing so the officer is never blocked.
      const fallback = mockExtractFields(userMessage, currentQuestion.field, formData);
      if (Object.keys(fallback).length > 0) {
        applyExtractedFields(fallback, currentQuestion);
      } else {
        const rateLimited = e.response?.status === 429 || e.response?.data?.message?.toLowerCase().includes('quota') || e.response?.data?.message?.toLowerCase().includes('rate limit');
        if (rateLimited) {
          handleQuotaLimited();
        } else {
          const msg = e.response?.data?.message || "I couldn't process that just now — please try again.";
          setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          setIsAiThinking(false);
        }
      }
    }
  }

  // Fast path: only fields that can be parsed deterministically (exact formats,
  // exact option words). Everything else goes to the AI.
  function fastPathExtract(message) {
    const lower = message.toLowerCase().trim();
    const fields = {};
    const exactType = INCIDENT_TYPE_KEYWORDS_EXACT[lower]
      || INCIDENT_TYPE_OPTIONS.find((o) => o.value === lower || o.label.toLowerCase() === lower)?.value;
    if (exactType) fields.incident_type = exactType;
    const isoDate = message.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoDate) fields.incident_date = isoDate[0];
    const timeMatch = extractTime(message);
    if (timeMatch && /^\d{1,2}:\d{2}$/.test(timeMatch) && !message.toLowerCase().includes('am') && !message.toLowerCase().includes('pm')) {
      fields.incident_time = timeMatch;
    }
    return fields;
  }

  // Fill the extracted fields into the report immediately, acknowledge what was
  // captured, and advance to the next unanswered question. No confirmation gate:
  // the officer sees exactly what was captured in the thread and can correct it
  // by replying or editing the summary panel at any time.
  function applyExtractedFields(extracted, currentQuestion) {
    const labelList = Object.keys(extracted).map((f) => FIELD_LABELS[f] || f).join(', ');
    setFormData((prev) => ({ ...prev, ...extracted }));

    const nextIndex = getNextQuestionIndex(currentQuestionIndex, formData, extracted);
    setCurrentQuestionIndex(nextIndex);

    if (nextIndex >= INITIAL_QUESTIONS.length) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Got it — ${labelList}. All done! I've captured everything needed for your report. Review the summary — you can edit any field directly. When you're ready, use Save as Draft or Submit Report.`,
        questionIndex: INITIAL_QUESTIONS.length - 1,
      }]);
    } else {
      const nextQuestion = INITIAL_QUESTIONS[nextIndex];
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Got it — ${labelList}. ${nextQuestion.text}`,
        questionIndex: nextIndex,
      }]);
    }
    setIsAiThinking(false);
  }

  async function ensureReportId() {
    if (reportId) return reportId;
    if (!validate(false)) return null;
    try {
      const r = await createReport(formData);
      const newReportId = r.data.data.id;
      setReportId(newReportId);
      window.localStorage.removeItem('bluewrite:create-draft');
      return newReportId;
    } catch (e) {
      setFormMessage(e.response?.data?.message || 'Unable to save report for AI assistance.');
      return null;
    }
  }

  // Triggered on any rate-limit rejection: enter cooldown and tell the officer once.
  function handleQuotaLimited() {
    setAiCooldownUntil(Date.now() + 60 * 1000);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'The AI service has reached its usage limit for now. You can keep answering — I\'ll parse answers locally — or try AI requests again in about a minute. Your report data is not affected.' },
    ]);
  }

  async function handleAIWritingRequest(presetKey, instruction) {
    if (isAiCoolingDown) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'The AI service is cooling down after reaching its usage limit. Try again in about a minute — your narrative is safe and you can keep editing it directly in the summary panel.',
      }]);
      setIsAiThinking(false);
      return;
    }
    const validReportId = await ensureReportId();
    if (!validReportId) {
      setIsAiThinking(false);
      return;
    }

    const presetKeys = presetKey ? [presetKey] : [];
    const allowedData = {
      title: '',
      incident_type: formData.incident_type || '',
      incident_date: formData.incident_date || '',
      incident_time: formData.incident_time || '',
      location: formData.location || '',
      summary: formData.summary || '',
      narrative: formData.narrative || '',
      complainant: formData.complainant || '',
      victim: formData.victim || '',
      suspect: formData.suspect || '',
      witness: formData.witness || '',
    };

    try {
      const response = await requestReportAssistance({
        action: 'improve',
        reportId: validReportId,
        reportData: allowedData,
        writingInstruction: instruction,
        presetKeys,
      });

      const suggestion = String(response.data.data.suggestion || '').replace(/\*/g, '').trim();
      if (suggestion) {
        setFormData((prev) => ({ ...prev, narrative: suggestion }));
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: presetKey
            ? `Here's the improved narrative (${presetKey}):`
            : `Here's the narrative updated with your instruction: "${instruction}"`,
        }]);
        setMessages((prev) => [...prev, { role: 'assistant', content: suggestion }]);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Want another improvement? Pick a preset below, or keep editing directly in the summary panel.',
        }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'The AI returned an empty suggestion. Please try again.' }]);
      }
    } catch (e) {
      const timedOut = e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT';
      const rateLimited = e.response?.status === 429 || e.response?.data?.message?.toLowerCase().includes('quota') || e.response?.data?.message?.toLowerCase().includes('rate limit');
      if (rateLimited) {
        handleQuotaLimited();
      } else {
        const msg = e.response?.data?.message
          || (timedOut ? 'AI request timed out. Please try again; your narrative has not been lost.' : 'Unable to get AI suggestion.');
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
      }
    } finally {
      setIsAiThinking(false);
    }
  }

  function handleWritingPreset(presetKey) {
    if (!formData.narrative || isAiThinking) return;
    const preset = WRITING_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    // Safety gate: every AI interaction passes the writing-request validation,
    // including preset clicks. Preset labels are allow-listed by design.
    const gate = validateWritingRequest(preset.label);
    if (!gate.valid) {
      setMessages((prev) => [...prev, { role: 'assistant', content: gate.message }]);
      return;
    }
    setPendingPreset(preset);
    handleSendMessage(preset.label);
  }

  // People mini-form: when the people question is active, render a compact inline
  // form (one input per optional role) under that question. Any subset can be
  // filled; free-text typing in the composer remains an equivalent path.
  function renderPeopleForm(msgIndex) {
    const msg = messages[msgIndex];
    if (!msg || msg.role !== 'assistant') return null;
    const qIndex = msg.questionIndex;
    if (qIndex === undefined) return null;
    const q = INITIAL_QUESTIONS[qIndex];
    if (!q || q.field !== 'people' || currentQuestionIndex !== qIndex || isAiThinking) return null;
    return (
      <PeopleInvolvedForm
        onDone={(people) => {
          const filled = Object.entries(people).filter(([, v]) => v && String(v).trim());
          if (filled.length === 0) {
            // Nothing entered → officer skipped; advance as if they typed "none".
            handleSendMessage('None of them are known at this time.');
            return;
          }
          const labelList = filled.map(([f]) => FIELD_LABELS[f] || f).join(', ');
          setFormData((prev) => ({ ...prev, ...Object.fromEntries(filled) }));
          const nextIndex = getNextQuestionIndex(currentQuestionIndex, formData, Object.fromEntries(filled));
          setCurrentQuestionIndex(nextIndex);
          if (nextIndex >= INITIAL_QUESTIONS.length) {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `Got it — ${labelList}. All done! I've captured everything needed for your report. Review the summary — you can edit any field directly. When you're ready, use Save as Draft or Submit Report.`,
              questionIndex: INITIAL_QUESTIONS.length - 1,
            }]);
          } else {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `Got it — ${labelList}. ${INITIAL_QUESTIONS[nextIndex].text}`,
              questionIndex: nextIndex,
            }]);
          }
        }}
      />
    );
  }

  // Date/time pickers: inline structured input for the date and time questions.
  // Same pattern as the people mini-form — deterministic, free, no AI parsing.
  function renderDateTimeForm(msgIndex) {
    const msg = messages[msgIndex];
    if (!msg || msg.role !== 'assistant') return null;
    const qIndex = msg.questionIndex;
    if (qIndex === undefined) return null;
    const q = INITIAL_QUESTIONS[qIndex];
    if (!q || !['incident_date', 'incident_time'].includes(q.field)) return null;
    if (currentQuestionIndex !== qIndex || isAiThinking) return null;
    if (q.field === 'incident_date' && formData.incident_date) return null;
    if (q.field === 'incident_time' && formData.incident_time) return null;
    return (
      <DateTimeForm
        mode={q.field}
        onDone={({ date, time }) => {
          const fields = {};
          const labels = [];
          if (date && !formData.incident_date) { fields.incident_date = date; labels.push('Incident Date'); }
          if (time && !formData.incident_time) { fields.incident_time = time; labels.push('Incident Time'); }
          if (Object.keys(fields).length === 0) return;
          const labelList = labels.join(', ');
          setFormData((prev) => ({ ...prev, ...fields }));
          const nextIndex = getNextQuestionIndex(currentQuestionIndex, formData, fields);
          setCurrentQuestionIndex(nextIndex);
          if (nextIndex >= INITIAL_QUESTIONS.length) {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `Got it — ${labelList}. All done! I've captured everything needed for your report. Review the summary — you can edit any field directly. When you're ready, use Save as Draft or Submit Report.`,
              questionIndex: INITIAL_QUESTIONS.length - 1,
            }]);
          } else {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `Got it — ${labelList}. ${INITIAL_QUESTIONS[nextIndex].text}`,
              questionIndex: nextIndex,
            }]);
          }
        }}
      />
    );
  }

  // Incident-type chips render inline under the current incident-type question
  // until the field is answered. Free-text typing remains an equivalent path.
  function renderQuestionChips(msgIndex) {
    const msg = messages[msgIndex];
    if (!msg || msg.role !== 'assistant') return null;
    const qIndex = msg.questionIndex;
    if (qIndex === undefined) return null;
    const q = INITIAL_QUESTIONS[qIndex];
    if (!q || q.field !== 'incident_type') return null;
    if (formData.incident_type || currentQuestionIndex !== qIndex || isAiThinking) return null;
    return (
      <div className="ml-10 mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Incident type choices">
        {INCIDENT_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={isAiThinking}
            onClick={() => handleSendMessage(opt.label)}
            className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-police-blue-500 hover:bg-police-blue-100/60 hover:text-police-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // "Draft with AI" opens the assistant popover and focuses the composer.
  // No AI request is fired here — only when the officer sends a message.
  const draftWithAI = () => {
    setAssistantOpen(true);
    window.setTimeout(() => {
      document.getElementById('report-composer-input')?.focus();
    }, 250);
  };

  // FAB toggle. The greeting is static, so first open only flips the persisted
  // hasGreeted flag — zero network requests, by construction.
  const toggleAssistant = () => {
    const next = !assistantOpen;
    setAssistantOpen(next);
    if (next && !hasGreeted) setHasGreeted(true);
  };

  const summaryPanel = (
    <SummaryPanelContent
      formData={formData}
      errors={errors}
      formMessage={formMessage}
      saveState={saveState}
      hasAnyData={hasAnyData}
      isSubmitReady={isSubmitReady}
      completeness={completeness}
      submitting={submitting}
      reportId={reportId}
      ensureReportId={ensureReportId}
      onFieldChange={handleFieldChange}
      onCancel={() => navigate('/officer/reports')}
      onSaveDraft={saveDraft}
      onSubmit={requestSubmit}
      aiSlot={
        <AIReportChat
          reportId={reportId}
          reportStatus={reportId ? 'Draft' : ''}
          reportContext={withDerivedRoles(formData)}
          onEnsureReportId={ensureReportId}
          onInsertSuggestion={(draft) => {
            setFormData((current) => ({ ...current, ...draft }));
            setToast({ message: 'AI report draft applied. Review every field before submitting.', type: 'success' });
          }}
          onRegisterApply={(getter) => {
            getPendingAIDraft.current = getter;
            setPendingAIDraft(getter ? getter() : null);
          }}
        />
      }
    />
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Draft restore/discard banner — unchanged flow */}
      {localDraftFound && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:px-6">
          <span><strong>Unsaved local draft found.</strong> Restore it to continue where you left off.</span>
          <span className="flex gap-2">
            <Button size="sm" onClick={restoreDraft}>Restore Draft</Button>
            <Button size="sm" variant="secondary" onClick={discardDraft}>Discard Draft</Button>
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ══════════ SUMMARY PANEL — MAIN content on all viewports ══════════ */}
        <section
          id="report-summary-panel"
          aria-label="Report summary"
          className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
        >
          <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-police-blue-100 text-police-blue-700">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-950">Report Summary</h2>
                  <p className="text-xs text-slate-600">Your report builds here — edit any field directly, or use the assistant</p>
                </div>
              </div>
            </div>
          </header>
          {summaryPanel}
        </section>
      </div>

      {/* ══════════ FLOATING ASSISTANT — FAB + popover ══════════
          Open/close never fires an AI request: the greeting is static and AI
          calls happen only in handleSendMessage / handleAIWritingRequest. */}
      {assistantOpen && (
        <>
          {/* Click-away layer */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setAssistantOpen(false)}
          />
          <div
            id="report-assistant-popover"
            role="dialog"
            aria-label="Report assistant"
            className="fixed bottom-24 right-4 z-50 flex h-[min(560px,calc(100dvh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6"
          >
            <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-police-blue-700 text-white">
                  <Bot size={15} />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold leading-tight text-slate-950">Report assistant</p>
                  <p className="text-[11px] leading-tight text-slate-500">Guided Q&A and writing help</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50"
                aria-label="Close assistant"
              >
                <X size={17} />
              </button>
            </header>
            <div
              ref={chatScrollRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
              role="log"
              aria-label="Report building conversation"
            >
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex max-w-full gap-2.5 ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === 'assistant' ? 'bg-police-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div
                      className={`inline-block animate-bubble-in rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-800' : 'rounded-tr-sm bg-police-blue-700 text-white'}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'assistant' && msg.questionIndex !== undefined && (
                    <p className="ml-10 mt-1 text-[11px] text-slate-500">
                      Step {msg.questionIndex + 1} of {INITIAL_QUESTIONS.length}
                    </p>
                  )}
                  {renderPeopleForm(idx)}
                  {renderDateTimeForm(idx)}
                  {renderQuestionChips(idx)}
                </div>
              ))}
              {isAiThinking && (
                <div className="flex gap-2.5" aria-live="polite" aria-label="Assistant is thinking">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-police-blue-700 text-white" aria-hidden="true">
                    <Bot size={14} />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} aria-hidden="true" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} aria-hidden="true" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} aria-hidden="true" />
                      <span className="sr-only">Assistant is thinking</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {formData.narrative && !isAiThinking && (
              <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-2.5">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Writing improvement presets">
                  {WRITING_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleWritingPreset(preset.key)}
                      disabled={isAiCoolingDown}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-police-blue-500 hover:bg-police-blue-100/60 hover:text-police-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed disabled:opacity-50"
                      title={isAiCoolingDown ? 'AI cooling down after usage limit — retry in about a minute' : undefined}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-end gap-2.5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 transition focus-within:border-police-blue-600 focus-within:ring-2 focus-within:ring-police-blue-600/20">
                <textarea
                  id="report-composer-input"
                  value={composerValue}
                  onChange={(e) => setComposerValue(e.target.value)}
                  placeholder={isAiThinking ? 'Waiting for assistant...' : 'Type your answer or writing instruction...'}
                  rows={1}
                  className="min-h-[24px] max-h-[120px] flex-1 resize-none border-none bg-transparent py-1 text-sm text-slate-900 placeholder-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isAiThinking}
                  aria-label="Message input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isAiThinking || !composerValue.trim()}
                  size="sm"
                  className="h-9 w-9 shrink-0 justify-center !px-0"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </div>
        </>
      )}

      {/* FAB — always rendered, bottom-right, step badge from currentQuestionIndex */}
      <button
        type="button"
        onClick={toggleAssistant}
        aria-label={assistantOpen ? 'Close report assistant' : 'Open report assistant'}
        aria-expanded={assistantOpen}
        aria-controls="report-assistant-popover"
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-police-blue-700 text-white shadow-xl transition hover:bg-police-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 focus-visible:ring-offset-2 sm:right-6"
      >
        {assistantOpen ? <X size={22} aria-hidden="true" /> : <Bot size={24} aria-hidden="true" />}
        {!assistantOpen && (
          <span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
            {Math.min(currentQuestionIndex + 1, INITIAL_QUESTIONS.length)}/{INITIAL_QUESTIONS.length}
          </span>
        )}
      </button>

      {/* ══════════ POST-SUBMIT OVERLAY — finished document + Print ══════════
          Shown only after submitReport resolves successfully. Read-only
          (renders PrintableReport, the same component as the view page).
          Close → proceeds to the persistent read-only view. */}
      {submittedReport && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/70" role="dialog" aria-modal="true" aria-label="Submitted report">
          <div className="no-print flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-bold text-slate-950">Report submitted — {submittedReport.report_number}</p>
                <p className="text-[11.5px] text-slate-600">The report is now read-only. Print it now or close to view it in your reports.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => { try { await recordReportPrint(submittedReport.id); } finally { window.print(); } }}
              >
                Print Report
              </Button>
              <Button size="sm" onClick={() => { const id = submittedReport.id; setSubmittedReport(null); navigate(`/officer/reports/${id}`); }}>
                Close & View Report
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-3 py-4 sm:px-6">
            <div className="print-report mx-auto max-w-[210mm] rounded-lg bg-white p-6 shadow-lg sm:p-10">
              <PrintableReport report={submittedReport} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={async () => {
          try {
            setSubmitting(true);
            const payload = withDerivedRoles({ ...formData, ...(getPendingAIDraft.current?.() || {}) });
            const created = await createReport(payload);
            const submitted = await submitReport(created.data.data.id);
            window.localStorage.removeItem('bluewrite:create-draft');
            setShowSubmitConfirm(false);
            // Show the finished document as an overlay instead of an immediate
            // redirect; closing it proceeds to the persistent read-only view.
            setSubmittedReport(submitted.data?.data || { ...created.data.data, status: 'Submitted' });
          } catch (e) {
            setShowSubmitConfirm(false);
            setFormMessage(e.response?.data?.message || 'Unable to submit report.');
          } finally {
            setSubmitting(false);
          }
        }}
        title="Submit Incident Report?"
        description="Once submitted, this report will be marked as Submitted. Please verify all report information before continuing."
        confirmLabel="Submit Report"
      />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormMessage('');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SummaryPanelContent — shared body for the desktop main panel and mobile sheet
// ═══════════════════════════════════════════════════════════════════════
function SummaryPanelContent({
  formData, errors, formMessage, saveState, hasAnyData, isSubmitReady, completeness, submitting,
  reportId, ensureReportId, aiSlot,
  onFieldChange, onCancel, onSaveDraft, onSubmit,
}) {
  const handleFormChange = (e) => {
    onFieldChange(e.target.name, e.target.value);
  };

  const requiredTotal = REQUIRED_FIELDS.length;
  const requiredDone = REQUIRED_FIELDS.filter((f) => (formData[f] || '').trim()).length;
  const narrativeDone = (formData.narrative || '').trim().length >= 30;
  const progress = Math.round(((requiredDone + (narrativeDone ? 1 : 0)) / (requiredTotal + 1)) * 100);
  const progressComplete = progress === 100;

  return (
    <>
      {/* Completion progress: gives the main panel a live sense of readiness */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-5 pb-3.5 pt-3.5 sm:px-6" aria-live="polite">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-bold text-slate-800">
            {progressComplete ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 size={15} aria-hidden="true" /> Ready to submit
              </span>
            ) : (
              <>Report completion</>
            )}
          </p>
          <span className="text-[12px] font-semibold tabular-nums text-slate-600">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${progressComplete ? 'bg-emerald-500' : 'bg-police-blue-600'}`}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
        {!progressComplete && (
          <p className="mt-1.5 text-[11.5px] text-slate-500">
            {narrativeDone
              ? `${requiredTotal - requiredDone} required field${requiredTotal - requiredDone === 1 ? '' : 's'} remaining`
              : `${requiredTotal - requiredDone} required field${requiredTotal - requiredDone === 1 ? '' : 's'} + a 30+ character narrative remaining`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6" role="region" aria-label="Report fields" aria-live="polite">
        {SUMMARY_SECTIONS.map((section) => {
          const sectionFields = section.fields;
          const sectionDone = sectionFields.filter((f) => (formData[f] || '').trim()).length;
          // PNP memorandum sections render as four authorship-distinct zones:
          // neutral header card, AI-assisted §III (accent border), officer-authored
          // §I/II/IV–VI (muted), and the signatory card.
          if (section.title === 'PNP Memorandum Header' || section.title === 'Investigation Report Sections') {
            if (section.title === 'PNP Memorandum Header') {
              return (
                <section key={section.title} className="mb-5 last:mb-2">
                  <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">{section.title}</h3>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-400">{sectionDone}/{sectionFields.length} filled</span>
                  </div>
                  <p className="mb-2.5 -mt-1.5 text-[11.5px] text-slate-500">{section.description}</p>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <p className="mb-3 border-b border-slate-200 pb-2 text-center text-[13px] font-bold uppercase tracking-wide text-navy-800">
                      Republic of the Philippines · National Police Commission · Philippine National Police
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input label="Regional Office" name="station_region" value={formData.station_region || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.station_region} disabled={submitting} />
                      <Input label="Station Name" name="station_name" value={formData.station_name || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.station_name} disabled={submitting} />
                      <Input label="City/Municipality, Province, ZIP Code" name="station_address" value={formData.station_address || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.station_address} disabled={submitting} />
                      <Input label="Station Email" name="station_email" type="email" value={formData.station_email || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.station_email} disabled={submitting} />
                      <Input label="Tel. Nr." name="station_contact" value={formData.station_contact || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.station_contact} disabled={submitting} />
                      <Input label="Memo Recipient (FOR)" name="recipient_office" value={formData.recipient_office || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.recipient_office} disabled={submitting} />
                    </div>
                  </div>
                </section>
              );
            }
            // Investigation Report Sections — rendered in the shape of the
            // actual PNP investigation report template: AI drafting panel
            // (gated on completeness), then header → memorandum → §I–VI (all
            // editable in place) → signatory block.
            const factsFilled = (formData[FACTS_FIELD] || '').trim().length > 0;
            const officerFields = OFFICER_AUTHORED_SECTIONS.filter((s) => (formData[s.field] || '').trim());
            const generatedCount = officerFields.length + (factsFilled ? 1 : 0);
            const gateReady = completeness.ready;
            const gateNote = completeness.missingLabels.length
              ? `Complete ${completeness.missingLabels.join(', ')} to generate the report.`
              : '';
            return (
              <section key={section.title} id="pnp-report-sections" className="mb-5 last:mb-2">
                <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">{section.title}</h3>
                  <span className="text-[11px] font-semibold tabular-nums text-slate-400">{generatedCount}/{OFFICER_AUTHORED_SECTIONS.length + 1} filled</span>
                </div>

                {/* Generate Report — gated on completeness (same check the
                    Submit button uses). Visible but disabled while incomplete;
                    no auto-trigger, ever. */}
                <div className="mb-4" id="ai-report-panel">
                  {!gateReady && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12.5px] text-slate-600 sm:p-5">
                      <p className="font-semibold text-slate-800">Generate report</p>
                      <p className="mt-1">{gateNote}</p>
                    </div>
                  )}
                  {gateReady && aiSlot}
                </div>

                {/* PNP template-formatted preview — every section editable in
                    place. Layout mirrors investigation_report_template.md. */}
                <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
                  {/* Header block */}
                  <div className="border-b border-slate-300 px-5 py-4 text-center sm:px-8">
                    <p className="text-[12.5px] font-bold uppercase leading-5 tracking-wide text-navy-800">Republic of the Philippines</p>
                    <p className="text-[12px] font-bold uppercase leading-5 tracking-wide text-navy-800">National Police Commission</p>
                    <p className="text-[12px] font-bold uppercase leading-5 tracking-wide text-navy-800">Philippine National Police</p>
                    {formData.station_region && <p className="text-[11.5px] leading-5 text-slate-600">{formData.station_region}</p>}
                    {formData.station_name && <p className="text-[12.5px] font-bold uppercase leading-5 text-navy-800">{formData.station_name} Police Station</p>}
                    {(formData.station_address || formData.station_email || formData.station_contact) && (
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        {[formData.station_address, formData.station_email && `Email: ${formData.station_email}`, formData.station_contact && `Tel. Nr.: ${formData.station_contact}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Memorandum block */}
                  <div className="border-b border-slate-300 px-5 py-4 sm:px-8">
                    <p className="text-[12px] text-slate-600">{formData.report_date ? formatDisplayDate(formData.report_date) : '[Date of report]'}</p>
                    <p className="mt-2 text-[13px] font-extrabold uppercase tracking-widest text-navy-800">Memorandum</p>
                    <div className="mt-2 space-y-1 text-[12.5px] text-slate-800">
                      <p><span className="inline-block w-20 font-bold">FOR</span>: {formData.recipient_office || <span className="text-slate-400">Recipient office</span>}</p>
                      <p><span className="inline-block w-20 font-bold">SUBJECT</span>: Investigation Report Re: {formData.incident_type || '—'} that transpired at {formData.location || '—'}</p>
                      <p><span className="inline-block w-20 font-bold">DATE</span>: {formData.incident_date ? formatDisplayDate(formData.incident_date) : '—'}</p>
                    </div>
                  </div>

                  {/* Body: §I–VI. The officer never writes these — the AI generates
                      them from the officer's short inputs (Section 5 "What
                      Happened" is the only narrative the officer types). They
                      appear here ONLY after generation, as editable text so the
                      officer can correct wording before submitting. */}
                  <div className="space-y-5 px-5 py-5 sm:px-8">
                    {generatedCount === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[12.5px] text-slate-500">
                        Sections I–VI will be generated here from your inputs above. Click "Generate Report" — then review and edit the wording before submitting.
                      </p>
                    ) : (
                      <>
                        {OFFICER_AUTHORED_SECTIONS.filter((s) => ['authority', 'matters_investigated'].includes(s.field)).map(({ label, field, rows }) => (
                          <Textarea key={field} label={label} name={field} value={formData[field] || ''} onChange={handleFormChange} rows={rows} disabled={submitting} />
                        ))}
                        <Textarea label="III. Facts of the case" name={FACTS_FIELD} value={formData[FACTS_FIELD] || ''} onChange={handleFormChange} rows={7} disabled={submitting} />
                        {OFFICER_AUTHORED_SECTIONS.filter((s) => !['authority', 'matters_investigated'].includes(s.field)).map(({ label, field, rows }) => (
                          <Textarea key={field} label={label} name={field} value={formData[field] || ''} onChange={handleFormChange} rows={rows} disabled={submitting} />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Signatory block */}
                  <div className="border-t border-slate-300 px-5 py-5 sm:px-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Investigated by</p>
                        <Input label="Name" name="officer_name_display" value="" onChange={() => {}} placeholder="Auto — the reporting Officer" disabled />
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Approved for filing / Noted by</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Name" name="approving_authority_name" value={formData.approving_authority_name || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.approving_authority_name} disabled={submitting} />
                          <Input label="Rank" name="approving_authority_rank" value={formData.approving_authority_rank || ''} onChange={handleFormChange} placeholder={FIELD_PLACEHOLDERS.approving_authority_rank} disabled={submitting} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          }
          // Dynamic type-specific fields — driven by the selected incident type.
          if (section.title === 'Type-Specific Details') {
            return (
              <TypeSpecificSection
                key={section.title}
                incidentType={formData.incident_type}
                typeSpecific={formData.type_specific_data}
                submitting={submitting}
                onFieldChange={onFieldChange}
              />
            );
          }
          return (
            <section key={section.title} className="mb-5 last:mb-2">
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">{section.formal || section.title}</h3>
                <span className="text-[11px] font-semibold tabular-nums text-slate-400">{sectionDone}/{sectionFields.length} filled</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sectionFields.map((field) => (
                  <FieldCard
                    key={field}
                    field={field}
                    label={FIELD_LABELS[field]}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                    value={formData[field] || ''}
                    error={errors[field]}
                    isRequired={REQUIRED_FIELDS.includes(field)}
                    onChange={onFieldChange}
                    incidentTypes={INCIDENT_TYPE_OPTIONS}
                    fullWidth={FULL_WIDTH_FIELDS.has(field)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 pb-3.5 pt-2.5 sm:px-6">
        {formMessage && (
          <p className="mb-2 text-[13px] font-medium text-red-600" role="alert" aria-live="assertive">{formMessage}</p>
        )}
        {saveState && (
          <p className="mb-2 flex items-center gap-2 text-[11.5px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            {saveState}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="secondary" className="flex-1" onClick={onSaveDraft} disabled={!hasAnyData}>Save as Draft</Button>
          <Button className="flex-1" onClick={onSubmit} disabled={!isSubmitReady || submitting}>Submit Report</Button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DateTimeForm — inline date/time pickers with quick buttons
// ═══════════════════════════════════════════════════════════════════════
function DateTimeForm({ mode, onDone }) {
  const today = new Date();
  const iso = (d) => d.toISOString().split('T')[0];
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');

  // Date mode offers both date + time (officers usually know both together);
  // time mode appears alone when only time is still missing.
  const showDate = mode === 'incident_date';
  const showTime = mode === 'incident_time';

  const submit = () => {
    if (showDate && !date) return;
    if (showTime && !time) return;
    onDone({ date: showDate ? date : '', time: showTime ? time : '' });
  };

  return (
    <div
      className="ml-10 mt-2 max-w-[440px] rounded-xl border border-police-blue-200 bg-white p-4 shadow-sm"
      role="group"
      aria-label={showDate ? 'Incident date and time' : 'Incident time'}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {showDate ? 'Pick the date — or type it if you prefer' : 'Pick the time — or type it if you prefer'}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {showDate && (
          <div>
            <label htmlFor="dt-date" className="mb-1 block text-xs font-bold text-slate-800">Incident Date</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setDate(iso(today))} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-police-blue-500 hover:bg-police-blue-100/60">Today</button>
              <button type="button" onClick={() => setDate(iso(yesterday))} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-police-blue-500 hover:bg-police-blue-100/60">Yesterday</button>
            </div>
            <input
              id="dt-date"
              type="date"
              value={date}
              max={iso(today)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"
            />
          </div>
        )}
        {showTime && (
          <div className="flex-1">
            <label htmlFor="dt-time" className="mb-1 block text-xs font-bold text-slate-800">Incident Time</label>
            <TimePicker value={time} onChange={setTime} ariaLabel="Incident time" />
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={(showDate && !date) || (showTime && !time)}
          className="rounded-lg bg-police-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-police-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PeopleInvolvedForm — inline mini-form for the optional people fields
// ═══════════════════════════════════════════════════════════════════════
const PEOPLE_ROLES = [
  { field: 'complainant', placeholder: 'e.g., Juan Dela Cruz' },
  { field: 'victim', placeholder: 'e.g., Maria Santos' },
  { field: 'suspect', placeholder: 'Name, description, or unknown' },
  { field: 'witness', placeholder: 'Name, or leave blank if none' },
];

function PeopleInvolvedForm({ onDone }) {
  const [values, setValues] = React.useState({ complainant: '', victim: '', suspect: '', witness: '' });
  const anyFilled = Object.values(values).some((v) => v.trim());

  return (
    <div
      className="ml-10 mt-2 max-w-[480px] rounded-xl border border-police-blue-200 bg-white p-4 shadow-sm"
      role="group"
      aria-label="People involved"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">All optional — fill only what you know</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PEOPLE_ROLES.map(({ field, placeholder }) => (
          <div key={field}>
            <label htmlFor={`people-${field}`} className="mb-1 block text-xs font-bold text-slate-800">{FIELD_LABELS[field]}</label>
            <input
              id={`people-${field}`}
              type="text"
              value={values[field]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">Or describe them in your own words below ↓</p>
        <button
          type="button"
          onClick={() => onDone(values)}
          className="rounded-lg bg-police-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-police-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {anyFilled ? 'Add to report' : 'Skip — none known'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Friendly display formats for the summary cards (raw values stay YYYY-MM-DD / HH:MM).
function formatDisplayDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) return value;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDisplayTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!m) return value;
  let h = Number(m[1]);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m[2]} ${ap}`;
}

// ═══════════════════════════════════════════════════════════════════════
// FieldCard — click-to-edit card in the summary panel
// ═══════════════════════════════════════════════════════════════════════
function FieldCard({ field, label, placeholder, value, error, isRequired, onChange, incidentTypes, fullWidth = false }) {
  const isEmpty = !value || !String(value).trim();
  const hasError = Boolean(error) && !isEmpty;
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value || '');
  const fieldId = `field-${field}`;
  const errorId = hasError ? `${fieldId}-error` : undefined;
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    if (!isEditing) setEditValue(value || '');
  }, [value, isEditing]);

  const commit = () => {
    onChange(field, editValue);
    setIsEditing(false);
  };

  // Close edit mode whenever focus leaves the card (click-away), committing
  // the current edit value first — so the collapsed card shows what was picked.
  const handleCardBlur = (e) => {
    if (!isEditing) return;
    if (e.relatedTarget && cardRef.current?.contains(e.relatedTarget)) return;
    commit();
  };

  const renderValue = () => {
    if (field === 'incident_type' && incidentTypes) {
      const selected = String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
      if (selected.length > 0) {
        return (
          <span className="flex flex-wrap gap-1.5">
            {selected.map((v) => {
              const opt = incidentTypes.find((o) => o.value === v);
              return (
                <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-police-blue-700 px-3 py-1 text-[12.5px] font-semibold text-white">
                  {opt ? opt.label : v}
                </span>
              );
            })}
          </span>
        );
      }
      return isEmpty ? <span className="italic text-slate-400">—</span> : value;
    }
    if (isEmpty) return <span className="italic text-slate-400">{placeholder || '—'}</span>;
    if (field === 'incident_date' || field === 'date_reported' || field === 'report_date') return <span className="font-medium text-slate-900">{formatDisplayDate(value)}</span>;
    if (field === 'incident_time' || field === 'time_reported' || field === 'report_time') return <span className="font-medium text-slate-900">{formatDisplayTime(value)}</span>;
    if (FIELD_SELECT_OPTIONS[field]) {
      const opt = FIELD_SELECT_OPTIONS[field].find((o) => o.value === value);
      return <span className="font-medium text-slate-900">{opt ? opt.label : value}</span>;
    }
    return <span className="whitespace-pre-wrap break-words font-medium text-slate-900">{value}</span>;
  };

  const renderInput = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !TEXTAREA_FIELDS.has(field)) {
        e.preventDefault();
        commit();
      }
      if (e.key === 'Escape') {
        setEditValue(value || '');
        setIsEditing(false);
      }
    };
    const inputProps = {
      id: fieldId,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      autoFocus: true,
      className: 'w-full rounded-lg border border-police-blue-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20',
      'aria-invalid': hasError,
      'aria-describedby': errorId,
      'aria-label': label,
    };

    if (field === 'incident_type' && incidentTypes) {
      const selectedList = editValue.split(',').map((v) => v.trim()).filter(Boolean);
      const selectedSlugs = selectedList.filter((v) => !v.startsWith('other:'));
      const customOther = selectedList.find((v) => v.startsWith('other:'))?.slice(6) || '';
      const isSelected = (o) => {
        if (o.value !== 'other') return selectedSlugs.includes(o.value);
        // "Other" counts as selected when the bare slug or a custom other: value exists.
        return selectedList.includes('other') || Boolean(customOther);
      };
      const toggle = (o) => {
        if (o.value === 'other') {
          // Toggling Other off removes both the slug and any custom other: value;
          // toggling on just marks the slug — the text field captures the detail.
          const rest = selectedList.filter((v) => v !== 'other' && !v.startsWith('other:'));
          return selectedList.includes('other') || customOther ? rest.join(',') : [...selectedList, 'other'].join(',');
        }
        return isSelected(o)
          ? selectedList.filter((v) => v !== o.value).join(',')
          : [...selectedList, o.value].join(',');
      };
      return (
        <div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} (multiple choice)`}>
            {incidentTypes.map((o) => {
              const selected = isSelected(o);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => {
                    // Multi-select: toggle each bubble independently, then commit
                    // immediately as a comma-separated list.
                    const next = toggle(o);
                    setEditValue(next);
                    onChange(field, next);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 ${selected ? 'border-police-blue-700 bg-police-blue-700 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-police-blue-500 hover:bg-police-blue-100/60 hover:text-police-blue-700'}`}
                >
                  {selected && <CheckCircle2 size={12} aria-hidden="true" />}
                  {o.label}
                </button>
              );
            })}
          </div>
          {/* "Other" gets a free-text field for custom types */}
          {(selectedList.includes('other') || customOther) && (
            <input
              type="text"
              value={customOther}
              onChange={(e) => {
                const custom = e.target.value.trim();
                const rest = selectedList.filter((v) => !v.startsWith('other:'));
                const next = custom ? [...rest, `other:${custom}`].join(',') : rest.join(',');
                setEditValue(next);
                onChange(field, next);
              }}
              placeholder="Specify the other incident type..."
              aria-label="Specify other incident type"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"
            />
          )}
          <p className="mt-2 text-[11px] text-slate-500">Select all that apply — click a selected bubble to remove it.</p>
        </div>
      );
    }
    if (field === 'incident_date') return <input {...inputProps} type="date" />;
    if (FIELD_SELECT_OPTIONS[field]) {
      return (
        <select
          {...inputProps}
          className={`${inputProps.className} cursor-pointer appearance-none`}
        >
          <option value="">{placeholder || 'Select'}</option>
          {FIELD_SELECT_OPTIONS[field].map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if (FIELD_INPUT_TYPES[field]) return <input {...inputProps} type={FIELD_INPUT_TYPES[field]} />;
    if (field === 'incident_time') {
      return (
        <TimePicker
          value={editValue}
          onChange={(next) => { setEditValue(next); onChange(field, next); }}
          ariaLabel={label}
        />
      );
    }
    if (TEXTAREA_FIELDS.has(field)) {
      return (
        <textarea
          {...inputProps}
          rows={field === 'narrative' ? 6 : field === 'summary' ? 3 : 4}
          className={`${inputProps.className} min-h-[80px] resize-y`}
          placeholder={placeholder}
        />
      );
    }
    return <input {...inputProps} type="text" placeholder={placeholder} />;
  };

  const narrativeShort = field === 'narrative' && !isEmpty && String(value).trim().length < 30;

  const focusField = () => setIsEditing(true);

  return (
    <div
      ref={cardRef}
      onBlur={handleCardBlur}
      className={`group rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm ${hasError ? 'border-red-300 bg-red-50 ring-1 ring-red-100' : isEmpty ? 'border-slate-200 bg-slate-50' : 'border-police-blue-200 bg-police-blue-100/20'} ${fullWidth ? 'md:col-span-2 xl:col-span-3' : ''}`}
    >
      <div className="relative">
        <div className="flex items-center gap-2 pr-6">
          <span className="text-xs font-bold text-slate-800">{label}</span>
          {isRequired && <span className="text-slate-400" aria-hidden="true" title="Required">●</span>}
          {hasError && <AlertTriangle size={13} className="text-red-500" aria-hidden="true" />}
          {!isEmpty && !hasError && <CheckCircle2 size={13} className="text-emerald-500" aria-hidden="true" />}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={focusField}
            className="absolute right-0 top-0 rounded-md p-1 text-slate-400 opacity-0 transition focus:opacity-100 group-hover:opacity-100 hover:bg-police-blue-100 hover:text-police-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50"
            aria-label={`Edit ${label}`}
          >
            <PenLine size={13} />
          </button>
        )}
        <div className="mt-1.5">
          {isEditing ? renderInput() : (
            <button
              type="button"
              onClick={focusField}
              className="block w-full rounded-lg text-left text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50"
              aria-label={`${label}${isEmpty ? ', empty' : `, ${String(value).slice(0, 50)}`}. Press Enter or Space to edit.`}
            >
              <span className="block">{renderValue()}</span>
            </button>
          )}
          {hasError && <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
          {isEmpty && isRequired && !hasError && (
            <p className="mt-1 text-[11px] text-slate-500">Required for submission.</p>
          )}
          {narrativeShort && (
            <p className="mt-1 text-[11px] text-slate-500">
              {30 - String(value).trim().length} more characters needed for submission (min. 30).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TypeSpecificSection — dynamic fields driven by the selected incident type.
// Values live in formData.type_specific_data (JSON blob). Rendered as simple
// labeled inputs (the click-to-edit FieldCard pattern doesn't fit a
// type-dependent field list that re-renders on every incident-type change).
// ═══════════════════════════════════════════════════════════════
function TypeSpecificSection({ incidentType, typeSpecific, submitting, onFieldChange }) {
  const fields = fieldsForIncidentType(incidentType);
  const values = typeSpecific && typeof typeSpecific === 'object' ? typeSpecific : {};

  const setValue = (name, value) => {
    onFieldChange('type_specific_data', { ...values, [name]: value });
  };

  if (!fields.length) {
    return (
      <section className="mb-5 last:mb-2">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">Type-Specific Details</h3>
        </div>
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[12.5px] text-slate-500">
          Select an incident type above to see its dedicated fields (e.g. stolen item details for Theft, vehicle details for Traffic accident).
        </p>
      </section>
    );
  }

  const slugs = String(incidentType || '').split(',').map((s) => s.trim()).filter(Boolean);
  const labels = slugs.map((s) => (s.startsWith('other:') ? TYPE_LABELS.other : TYPE_LABELS[s])).filter(Boolean);
  const filled = fields.filter((def) => String(values[def.name] || '').trim()).length;

  return (
    <section className="mb-5 last:mb-2">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">Type-Specific Details</h3>
        <span className="text-[11px] font-semibold tabular-nums text-slate-400">{filled}/{fields.length} filled</span>
      </div>
      <p className="mb-2.5 -mt-1.5 text-[11.5px] text-slate-500">
        {labels.length ? `Fields for: ${labels.join(', ')}. All optional.` : 'Fields for the selected incident type. All optional.'}
      </p>
      <div className="rounded-xl border border-police-blue-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((def) => {
            const value = values[def.name] || '';
            if (def.type === 'textarea') {
              return (
                <Textarea
                  key={def.name}
                  label={def.label}
                  value={value}
                  onChange={(e) => setValue(def.name, e.target.value)}
                  rows={2}
                  disabled={submitting}
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
                  onChange={(e) => setValue(def.name, e.target.value)}
                  options={def.options}
                  placeholder="Select"
                  disabled={submitting}
                />
              );
            }
            return (
              <Input
                key={def.name}
                label={def.label}
                type={def.type === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => setValue(def.name, e.target.value)}
                disabled={submitting}
              />
            );
          })
          }
        </div>
      </div>
    </section>
  );
}

export default CreateReportPage;
