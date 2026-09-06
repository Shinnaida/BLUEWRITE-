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
import TimePicker from '../../components/common/TimePicker';
import {
  Send, Bot, User, AlertTriangle, CheckCircle2, X, PenLine, FileText,
  PanelRightOpen, PanelRightClose,
} from 'lucide-react';

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
  narrative: 'Full incident narrative',
};

const REQUIRED_FIELDS = ['incident_type', 'location', 'incident_date', 'incident_time'];

// Summary sections: groups the click-to-edit cards so the main panel reads like
// a structured report instead of one long stack. `full` fields span the grid width.
const SUMMARY_SECTIONS = [
  {
    title: 'Incident Details',
    description: 'The core facts — required before submission.',
    fields: ['incident_type', 'incident_date', 'incident_time', 'location'],
  },
  {
    title: 'People Involved',
    description: 'Optional — fill only the roles you know.',
    fields: ['complainant', 'victim', 'suspect', 'witness'],
  },
  {
    title: 'Report Content',
    description: 'The story of the incident in your own words.',
    fields: ['summary', 'narrative'],
  },
];

const FULL_WIDTH_FIELDS = new Set(['summary', 'narrative']);

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

  // Assistant side panel (desktop): open by default, toggleable from the summary header.
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  // Summary bottom sheet (mobile/tablet): collapsed by default; auto-reveals ONCE on first field fill.
  const [summarySheetOpen, setSummarySheetOpen] = React.useState(false);
  const panelAutoRevealed = React.useRef(false);
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
  // Quota cooldown: after a rate-limit rejection, suppress further AI attempts for
  // 60s so the officer isn't spammed with errors and the API isn't hammered.
  const [aiCooldownUntil, setAiCooldownUntil] = React.useState(0);
  const isAiCoolingDown = Date.now() < aiCooldownUntil;

  const hasAnyData = Object.keys(formData).length > 0;

  // ── Draft found banner ─────────────────────────────────────────────
  React.useEffect(() => {
    setLocalDraftFound(Boolean(window.localStorage.getItem('bluewrite:create-draft')));
  }, []);

  // ── Debounced localStorage draft autosave (unchanged behavior) ─────
  React.useEffect(() => {
    if (!Object.keys(formData).length) return undefined;
    setSaveState('Saving draft locally...');
    const timer = window.setTimeout(() => {
      window.localStorage.setItem('bluewrite:create-draft', JSON.stringify(formData));
      setSaveState(`Draft saved locally at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [formData]);

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

  // ── Auto-reveal: the first time ANY field gets a value, open the panel
  //    exactly once. Manual collapse afterwards never re-triggers this. ──
  React.useEffect(() => {
    if (!panelAutoRevealed.current && Object.keys(formData).length > 0) {
      panelAutoRevealed.current = true;
      setSummarySheetOpen(true);
    }
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
      setFormData(JSON.parse(window.localStorage.getItem('bluewrite:create-draft')) || {});
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

  const saveDraft = async () => {
    if (!validate(false)) return;
    try {
      const r = await createReport(formData);
      window.localStorage.removeItem('bluewrite:create-draft');
      navigate(`/officer/reports/${r.data.data.id}/edit`);
    } catch (e) {
      setFormMessage(e.response?.data?.message || 'Unable to save report.');
    }
  };

  const requestSubmit = () => {
    if (validate(true)) setShowSubmitConfirm(true);
  };

  const isSubmitReady = React.useMemo(() => {
    const nextErrors = {};
    if (!formData.incident_type?.trim()) nextErrors.incident_type = 'Incident type is required.';
    if (!formData.incident_date?.trim()) nextErrors.incident_date = 'Incident date is required.';
    if (!formData.incident_time?.trim()) nextErrors.incident_time = 'Incident time is required.';
    if (!formData.location?.trim()) nextErrors.location = 'Incident location is required.';
    if (!formData.narrative || formData.narrative.trim().length < 30) nextErrors.narrative = 'Narrative must be at least 30 characters.';
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

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
        knownFields: formData,
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

  const summaryPanel = (
    <SummaryPanelContent
      formData={formData}
      errors={errors}
      formMessage={formMessage}
      saveState={saveState}
      hasAnyData={hasAnyData}
      isSubmitReady={isSubmitReady}
      submitting={submitting}
      onFieldChange={handleFieldChange}
      onCancel={() => navigate('/officer/reports')}
      onSaveDraft={saveDraft}
      onSubmit={requestSubmit}
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
        {/* ══════════ CHAT PANEL — side panel on desktop (right), main on mobile ══════════ */}
        <section
          id="report-assistant-panel"
          className={`flex min-w-0 flex-1 flex-col bg-white transition-all duration-300 ease-out lg:order-2 lg:flex-none lg:shrink-0 lg:overflow-hidden ${assistantOpen ? 'lg:w-[420px] lg:border-l lg:border-slate-200' : 'lg:w-0 lg:border-l-transparent'}`}
          aria-label="Report Assistant chat"
        >
          {/* Chat header */}
          <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-police-blue-100 text-police-blue-700">
                  <Bot size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-950">Report Assistant</h2>
                  <p className="text-xs text-slate-600">Answer a few questions to build your report</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden rounded-full bg-police-blue-100 px-2.5 py-1 text-[11.5px] font-semibold text-police-blue-700 sm:inline-flex">
                  Step {Math.min(currentQuestionIndex + 1, INITIAL_QUESTIONS.length)} of {INITIAL_QUESTIONS.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSummarySheetOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 lg:hidden ${summarySheetOpen ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-300 bg-white text-slate-700 hover:border-police-blue-400 hover:text-police-blue-700'}`}
                  aria-expanded={summarySheetOpen}
                  aria-controls="report-summary-sheet"
                >
                  {summarySheetOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                  {summarySheetOpen ? 'Hide summary' : 'Show summary'}
                </button>
                {/* Persistent Save/Submit access while the sheet is collapsed (mobile/tablet) */}
                {!summarySheetOpen && (
                  <div className="hidden items-center gap-2 md:flex lg:hidden">
                    <Button size="sm" variant="secondary" onClick={saveDraft} disabled={!hasAnyData}>Save as Draft</Button>
                    <Button size="sm" onClick={requestSubmit} disabled={!isSubmitReady || submitting}>Submit Report</Button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
            role="log"
            aria-label="Report building conversation"
          >
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex max-w-[640px] gap-2.5 ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
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
                {/* People mini-form: renders inline under the active people question */}
                {renderPeopleForm(idx)}
                {/* Date/time pickers: render inline under the active date/time question */}
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

          {/* Writing preset chips — inline in thread once narrative captured */}
          {formData.narrative && !isAiThinking && (
            <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-2.5 sm:px-6">
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

          {/* Persistent Save/Submit access while panel is collapsed (narrow viewports) */}
          {!summarySheetOpen && (
            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 sm:px-6 lg:hidden">
              <Button size="sm" variant="secondary" onClick={saveDraft} disabled={!hasAnyData}>Save as Draft</Button>
              <Button size="sm" onClick={requestSubmit} disabled={!isSubmitReady || submitting}>Submit Report</Button>
            </div>
          )}

          {/* Composer */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex items-end gap-2.5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 transition focus-within:border-police-blue-600 focus-within:ring-2 focus-within:ring-police-blue-600/20">
              <textarea
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
        </section>

        {/* ══════════ SUMMARY PANEL (desktop) — MAIN panel ══════════ */}
        <section
          id="report-summary-panel"
          aria-label="Report summary"
          className="hidden h-full min-h-0 flex-1 flex-col overflow-hidden bg-white lg:order-1 lg:flex"
        >
          <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-police-blue-100 text-police-blue-700">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-950">Report Summary</h2>
                  <p className="text-xs text-slate-600">Your report builds here as you answer — edit any field directly</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden rounded-full bg-police-blue-100 px-2.5 py-1 text-[11.5px] font-semibold text-police-blue-700 sm:inline-flex">
                  Step {Math.min(currentQuestionIndex + 1, INITIAL_QUESTIONS.length)} of {INITIAL_QUESTIONS.length}
                </span>
                <button
                  type="button"
                  onClick={() => setAssistantOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition hover:border-police-blue-400 hover:text-police-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50"
                  aria-expanded={assistantOpen}
                  aria-controls="report-assistant-panel"
                >
                  {assistantOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                  {assistantOpen ? 'Hide assistant' : 'Show assistant'}
                </button>
              </div>
            </div>
          </header>
          {summaryPanel}
        </section>
      </div>

      {/* ══════════ SUMMARY SHEET (mobile/tablet) — bottom sheet ══════════ */}
      {summarySheetOpen && (
        <div
          id="report-summary-sheet"
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[62vh] flex-col border-t border-slate-200 bg-white shadow-2xl lg:hidden"
          role="region"
          aria-label="Report summary"
        >
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            {summaryPanel}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={async () => {
          try {
            setSubmitting(true);
            const created = await createReport(formData);
            await submitReport(created.data.data.id);
            window.localStorage.removeItem('bluewrite:create-draft');
            setShowSubmitConfirm(false);
            navigate('/officer/reports');
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
  formData, errors, formMessage, saveState, hasAnyData, isSubmitReady, submitting,
  onFieldChange, onCancel, onSaveDraft, onSubmit,
}) {
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
          return (
            <section key={section.title} className="mb-5 last:mb-2">
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">{section.title}</h3>
                <span className="text-[11px] font-semibold tabular-nums text-slate-400">{sectionDone}/{sectionFields.length} filled</span>
              </div>
              {section.title === 'People Involved' && (
                <p className="mb-2.5 -mt-1.5 text-[11.5px] text-slate-500">{section.description}</p>
              )}
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
    if (field === 'incident_date') return <span className="font-medium text-slate-900">{formatDisplayDate(value)}</span>;
    if (field === 'incident_time') return <span className="font-medium text-slate-900">{formatDisplayTime(value)}</span>;
    return <span className="whitespace-pre-wrap break-words font-medium text-slate-900">{value}</span>;
  };

  const renderInput = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !(field === 'summary' || field === 'narrative')) {
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
    if (field === 'incident_time') {
      return (
        <TimePicker
          value={editValue}
          onChange={(next) => { setEditValue(next); onChange(field, next); }}
          ariaLabel={label}
        />
      );
    }
    if (field === 'summary' || field === 'narrative') {
      return (
        <textarea
          {...inputProps}
          rows={field === 'narrative' ? 6 : 3}
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
      className={`group rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm ${hasError ? 'border-red-300 bg-red-50 ring-1 ring-red-100' : isEmpty ? (isRequired ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50') : 'border-police-blue-200 bg-police-blue-100/20'} ${fullWidth ? 'md:col-span-2 xl:col-span-3' : ''}`}
    >
      <div className="relative">
        <div className="flex items-center gap-2 pr-6">
          <span className="text-xs font-bold text-slate-800">{label}</span>
          {isRequired && <span className="text-amber-600" aria-hidden="true" title="Required">●</span>}
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
            <p className="mt-1 text-[11px] text-amber-700">Required for submission.</p>
          )}
          {narrativeShort && (
            <p className="mt-1 text-[11px] text-amber-700">
              {30 - String(value).trim().length} more characters needed for submission (min. 30).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateReportPage;
