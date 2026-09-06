const env = require('../config/env');
const { buildStructuredFacts, cleanFactsForGeneration, validateDraft, auditCategories, normalizeNarrativeOutput } = require('./aiFactService');
const { POLICE_REPORT_SYSTEM_PROMPT, POLICE_REPORT_CHECK_PROMPT, POLICE_REPORT_DRAFT_PROMPT } = require('../prompts/policeReportPrompt');
const googleAIService = require('./googleAIService');

const SYSTEM_INSTRUCTION = POLICE_REPORT_SYSTEM_PROMPT;
const CHECK_SYSTEM_INSTRUCTION = POLICE_REPORT_CHECK_PROMPT;
const REPORT_DRAFT_SYSTEM_INSTRUCTION = POLICE_REPORT_DRAFT_PROMPT;
const REPORT_DRAFT_FIELDS = ['title', 'incident_type', 'incident_date', 'incident_time', 'location', 'summary', 'narrative', 'complainant', 'victim', 'suspect', 'witness'];
const REPORT_DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: REPORT_DRAFT_FIELDS,
  properties: Object.fromEntries(REPORT_DRAFT_FIELDS.map((field) => [field, { type: 'string' }])),
};

const ACTIONS = Object.freeze({
  extract: {
    event: 'AI_REPORT_FIELDS_EXTRACTED',
    instruction: [
      'You are the extraction step of BLUEWRITE, a police incident report system.',
      'An Officer is answering guided questions to build a report. Extract ONLY facts the Officer explicitly stated in MESSAGE.',
      'Return the required JSON object. Use an empty string for any field not explicitly stated in MESSAGE.',
      'NEVER invent, guess, or infer unstated facts. NEVER copy facts from KNOWN_FIELDS back into extracted values.',
      'Resolve relative dates and times (today, yesterday, last night, around 9pm, kagabi, kahapon) against CURRENT_DATE and the 24-hour clock (HH:MM).',
      'incident_type must be exactly one of: theft, assault, burglary, traffic, vandalism, disturbance, fraud, other — or empty if not clearly stated.',
      '  Map crime vocabulary to the closest type: robbed/robbery/snatched/pickpocketed/mugged/holdup/nakawan → theft; estafa/con/scam/identity theft → fraud; stabbed/slapped/mauled/attacked → assault; car/motorcycle crash or collision → traffic; window smashed/graffiti/property destroyed → vandalism; noisy argument/fight/commotion → disturbance.',
      'incident_date must be YYYY-MM-DD or empty. incident_time must be HH:MM (24-hour) or empty.',
      'location must be the shortest contiguous place phrase copied verbatim from MESSAGE (address, street, landmark, or place name), or empty.',
      'summary is a 1-2 sentence restatement of what the Officer said happened, or empty.',
      'narrative is the Officer account verbatim when MESSAGE contains a full incident account, or empty.',
      'complainant/victim/suspect/witness: the person name ONLY when MESSAGE explicitly ties that name to that role, or empty.',
      '',
      'EXAMPLES (CURRENT_DATE: 2026-09-06)',
      'MESSAGE: robbed at knifepoint near the mall parking lot around 9 last night, complainant was Juan Dela Cruz',
      'RESULT: {"incident_type":"theft","location":"near the mall parking lot","incident_date":"2026-09-05","incident_time":"21:00","complainant":"Juan Dela Cruz","victim":"","suspect":"","witness":"","summary":"The complainant reported being robbed at knifepoint near the mall parking lot at approximately 21:00 on September 5, 2026.","narrative":""}',
      'MESSAGE: nanakawan po ng cellphone kagabi sa palengke',
      'RESULT: {"incident_type":"theft","location":"palengke","incident_date":"2026-09-05","incident_time":"","complainant":"","victim":"","suspect":"","witness":"","summary":"A cellphone was stolen from the reporting officer at the palengke last night.","narrative":""}',
      'MESSAGE: traffic accident along EDSA near Quezon Ave this morning around 7:30, victim is Maria Santos',
      'RESULT: {"incident_type":"traffic","location":"EDSA near Quezon Ave","incident_date":"2026-09-06","incident_time":"07:30","complainant":"","victim":"Maria Santos","suspect":"","witness":"","summary":"A traffic accident occurred along EDSA near Quezon Avenue at approximately 07:30 this morning; Maria Santos was the victim.","narrative":""}',
    ].join('\n'),
  },
  generate: {
    event: 'AI_REPORT_DRAFT_GENERATED',
    instruction: 'Create a complete editable BLUEWRITE report draft from the Officer narrative and STRUCTURED_FACTS. Return the required JSON report object. Do not invent missing report fields. The narrative property must be one coherent, concise, chronological paragraph.',
  },
  improve: {
    event: 'AI_NARRATIVE_IMPROVED',
    instruction: 'Rewrite the supplied facts as one coherent continuous narrative paragraph, improving only grammar, clarity, chronology, organization, concision, and neutral professional wording. Remove duplicate meaning while preserving every distinct fact, uncertainty marker, negative fact, attribution, description, range, role, and action status. Return narrative prose only without headings, labels, bullets, JSON, Markdown, or blank-line paragraph breaks.',
  },
  check: {
    event: 'AI_NARRATIVE_CHECKED',
    instruction: 'Review the supplied narrative without rewriting it. Return a concise plain-text list of suggestions about clarity, grammar, chronology, duplicate information, unclear references, or details the Officer may want to verify. Do not claim a missing event occurred and do not invent facts.',
  },
});

const WRITING_PRESETS = Object.freeze({
  concise: 'Make the narrative more concise without removing supplied facts.',
  clarity: 'Improve grammar and clarity while preserving every supplied fact.',
  chronology: 'Improve the chronological order using only the supplied sequence of events.',
  neutral: 'Use neutral, objective, professional wording.',
  verify: 'Identify unclear or incomplete details the Officer may want to verify.',
  repetition: 'Remove repetitive wording without removing supplied facts.',
});

const WRITING_REQUEST_REFUSAL = 'This assistant supports incident-report writing only. Enter a request about clarity, grammar, chronology, tone, organization, length, repetition, or details to verify. It cannot invent facts, make investigative decisions, determine guilt, or provide unrelated content.';
const unsafeRequestPatterns = [
  /\b(ignore|bypass|override|disregard)\b.{0,40}\b(rule|instruction|policy|safety)\b/i,
  /\b(invent|fabricate|make up|add|adding)\b.{0,45}\b(fact|evidence|suspect|witness|confession|statement|action|actions|injury|weapon)\b/i,
  /\b(say|state|claim|write)\b.{0,40}\b(confessed|admitted|committed|possessed|threatened|assaulted)\b/i,
  /\b(change|alter|replace)\b.{0,35}\b(date|time|name|location|fact|evidence)\b/i,
  /\b(guilty|innocent|convict|legal advice|investigative decision)\b/i,
  /\b(joke|poem|song|weather|recipe|game|sports|politics)\b/i,
];
const writingIntentPatterns = [
  /\b(concise|shorter|longer|brief|length|summari[sz]e)\b/i,
  /\b(grammar|grammatical|spelling|punctuation|sentence|paragraph)\b/i,
  /\b(clear|clearer|clarity|wording|rewrite|rephrase|revise|edit|improve)\b/i,
  /\b(chronolog(?:y|ical)|sequence|timeline|order|transition)\b/i,
  /\b(tone|neutral|objective|professional|formal)\b/i,
  /\b(organi[sz]e|organization|structure|format|narrative|report)\b/i,
  /\b(repetition|repetitive|duplicate|redundant|unclear|review|verify)\b/i,
];

const text = (value, max = 6000) => String(value ?? '').trim().slice(0, max);

function resolveWritingRequest(presetKeys = [], customInstruction = '') {
  const keys = Array.isArray(presetKeys) ? [...new Set(presetKeys.map((key) => text(key, 40)))] : [];
  if (keys.some((key) => !WRITING_PRESETS[key])) throw Object.assign(new Error('Invalid writing preset.'), { status: 400, code: 'INVALID_WRITING_PRESET' });
  const custom = text(customInstruction, 501);
  if (custom.length > 500) throw Object.assign(new Error('Writing instructions must be 500 characters or fewer.'), { status: 400, code: 'WRITING_REQUEST_TOO_LONG' });
  if (custom && unsafeRequestPatterns.some((pattern) => pattern.test(custom))) throw Object.assign(new Error(WRITING_REQUEST_REFUSAL), { status: 400, code: 'AI_WRITING_REQUEST_REJECTED' });
  if (custom && !writingIntentPatterns.some((pattern) => pattern.test(custom))) throw Object.assign(new Error(WRITING_REQUEST_REFUSAL), { status: 400, code: 'AI_WRITING_REQUEST_REJECTED' });
  const parts = [...keys.map((key) => WRITING_PRESETS[key]), custom].filter(Boolean);
  return { presetKeys: keys, customInstruction: custom, combined: parts.join(' ') };
}

const protectedTokens = (value) => {
  const source = text(value, 30000);
  return new Set([
    ...(source.match(/\b\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\b/g) || []),
    ...(source.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/gi) || []),
    ...(source.match(/(?:[$₱]\s?\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:dollars?|pesos?|km|kg|years? old)\b|\b\d+\s*[–-]\s*\d+\s*(?:years? old|year-old)?)/gi) || []),
    ...(source.match(/\b(?:BW|CASE|PLATE|ID)[-: ]?[A-Z0-9-]{3,}\b/gi) || []),
  ].map((token) => token.toLowerCase()));
};

const uncertaintyTerms = ['not sure','possibly','possible','around','approximately','approximate','about','appeared','appears','may','might','could','unknown','estimated','reportedly','allegedly'];
const sourceText = (context) => [context.incidentType,context.incidentDate,context.incidentTime,context.location,context.summary,context.narrative,...context.people.flatMap((person)=>[person.type,person.name,person.statement,person.notes])].filter(Boolean).join(' ');
const sentences = (value) => text(value,20000).match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map((part)=>part.trim()).filter(Boolean)||[];
const hasTerm = (value,term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')}\\b`,'i').test(value);

function factualConsistencyValidation(context,suggestion) {
  const source=sourceText(context),lowerSource=source.toLowerCase(),lowerSuggestion=suggestion.toLowerCase();
  const protectedAnalysis=analyzeProtectedFacts(context,suggestion);
  const removedUncertainty=uncertaintyTerms.filter((term)=>hasTerm(source,term)&&!hasTerm(suggestion,term));
  const unsupportedLabels=['suspect','offender','perpetrator'].filter((label)=>hasTerm(suggestion,label)&&!hasTerm(source,label));
  const unsupportedConclusions=['guilty','intentionally','deliberately','motive','owned by','responsible for','committed the'].filter((term)=>lowerSuggestion.includes(term)&&!lowerSource.includes(term));
  const sourceHasIncompleteAction=/\b(could not|unable to|not available|unavailable|planned|pending|attempted|to be reviewed|will review|could be reviewed)\b/i.test(source);
  const completedActionPatterns=[/\b(?:reviewed|obtained|collected|recovered|confirmed|verified|interviewed|arrested|seized)\b/i];
  const unsupportedCompletedActions=sourceHasIncompleteAction?sentences(suggestion).filter((sentence)=>completedActionPatterns.some((pattern)=>pattern.test(sentence))&&!/\b(could not|unable to|not available|unavailable|planned|pending|attempted|was not|were not)\b/i.test(sentence)).map((sentence)=>sentence.slice(0,240)):[];
  const clothingWords=['cap','hat','shirt','jacket','hoodie','pants','shorts','shoes','dress','uniform'];
  const colorWords=['black','white','gray','grey','red','blue','green','yellow','brown','orange','purple'];
  const changedDescriptions=[];
  for(const clothing of clothingWords){if(hasTerm(source,clothing)&&hasTerm(suggestion,clothing)){const outputColors=colorWords.filter((color)=>hasTerm(suggestion,color));for(const color of outputColors)if(!hasTerm(source,color))changedDescriptions.push(`${color} ${clothing}`)}}
  const possibleContradictions=[];
  if(/\bno injuries?\b/i.test(source)&&/\b(?:was|were|sustained|reported)\s+(?:an?\s+)?injur/i.test(suggestion))possibleContradictions.push('The draft may contradict the supplied injury information.');
  if(/\b(?:no|not)\s+(?:weapon|evidence)\b/i.test(source)&&/\b(?:weapon|evidence)\s+(?:was|were)\s+(?:found|recovered|collected|located)\b/i.test(suggestion))possibleContradictions.push('The draft may contradict the supplied evidence or weapon information.');
  const categories=[];
  if(protectedAnalysis.newProtectedValues.length)categories.push('New or changed protected values');
  if(protectedAnalysis.missingSuppliedNames.length)categories.push('Supplied names omitted');
  if(removedUncertainty.length)categories.push('Uncertainty language removed');
  if(changedDescriptions.length)categories.push('Description may have changed');
  if(unsupportedLabels.length)categories.push('Unsupported person designation');
  if(unsupportedConclusions.length)categories.push('Unsupported conclusion');
  if(unsupportedCompletedActions.length)categories.push('Investigative action may be incorrectly completed');
  if(possibleContradictions.length)categories.push('Possible contradiction');
  return {...protectedAnalysis,hasWarning:categories.length>0,categories,removedUncertainty,changedDescriptions:[...new Set(changedDescriptions)],unsupportedLabels,unsupportedConclusions,unsupportedCompletedActions,possibleContradictions,autoCorrected:false,removedSentenceCount:0,correctedSuggestion:suggestion};
}

function analyzeProtectedFacts(context, suggestion) {
  const source = JSON.stringify(context);
  const sourceTokens = protectedTokens(source);
  const newProtectedValues = [...protectedTokens(suggestion)].filter((token) => !sourceTokens.has(token));
  const suppliedNames = context.people.map((person) => text(person.name, 250)).filter(Boolean);
  const missingSuppliedNames = suppliedNames.filter((name) => !suggestion.toLowerCase().includes(name.toLowerCase()));
  return { hasWarning: newProtectedValues.length > 0 || missingSuppliedNames.length > 0, newProtectedValues, missingSuppliedNames };
}

function buildReportContext(report, formData = {}) {
  const value = (key, max) => text(formData[key] !== undefined ? formData[key] : report[key], max);
  const people = Array.isArray(report.people)
    ? report.people.map((person) => ({
      type: text(person.person_type, 40),
      name: [text(person.first_name, 100), text(person.middle_name, 100), text(person.last_name, 100)].filter(Boolean).join(' '),
      age: person.age === null || person.age === undefined ? null : Number(person.age),
      sex: text(person.sex, 20),
      address: text(person.address, 500),
      statement: text(person.statement, 2000),
      notes: text(person.notes, 1000),
      canonical: true,
      source: 'report_people',
    }))
    : [];

  for (const type of ['complainant', 'victim', 'suspect', 'witness']) {
    const supplied = text(formData[type], 250);
    if (supplied) people.push({ type, name: supplied, canonical: true, source: 'officer_role_field' });
  }

  return {
    reportNumber: text(report.report_number, 50),
    title: value('title', 255),
    incidentType: value('incident_type', 100),
    incidentDate: value('incident_date', 20),
    incidentTime: value('incident_time', 20),
    location: value('location', 500),
    summary: value('summary', 3000),
    narrative: value('narrative', 12000),
    people,
  };
}

function validateContext(action, context) {
  if (!ACTIONS[action]) throw Object.assign(new Error('Invalid AI assistance action.'), { status: 400, code: 'INVALID_ACTION' });
  if ((action === 'improve' || action === 'check') && context.narrative.length < 20) {
    throw Object.assign(new Error('Enter a narrative of at least 20 characters before using this action.'), { status: 400, code: 'INSUFFICIENT_CONTEXT' });
  }
  if (action === 'generate') {
    if (context.narrative.length < 20) {
      throw Object.assign(new Error('Enter raw incident information in Narrative before generating a report draft.'), { status: 400, code: 'INSUFFICIENT_CONTEXT' });
    }
  }
}

function providerConfig() {
  return googleAIService.configuration();
}

async function requestCompletion(config, messages, options = {}) {
  const instructionMessage = messages.find((message) => message.role === 'system');
  const inputMessage = messages.find((message) => message.role === 'user');
  const result = await googleAIService.generatePoliceReport({
    instructions: instructionMessage?.content || SYSTEM_INSTRUCTION,
    input: inputMessage?.content || '',
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
    responseMimeType: options.responseMimeType,
    responseJsonSchema: options.responseJsonSchema,
  });
  return result.text;
}

function parseReportDraft(value) {
  let parsed;
  try { parsed = JSON.parse(String(value || '').replace(/^```json\s*|```$/gi, '').trim()); } catch {
    // Preserve compatibility with a plain-text provider response while still
    // returning the structured application contract.
    parsed = { narrative: String(value || '') };
  }
  return Object.fromEntries(REPORT_DRAFT_FIELDS.map((field) => [field, text(parsed?.[field], field === 'narrative' ? 12000 : (field === 'summary' ? 3000 : 500))]));
}

const INCIDENT_TYPE_PATTERNS = {
  theft: /\b(theft|stole|stolen|rob(?:bed|bery)?|snatch(?:ed|ing)?|pickpocket(?:ed)?|mugged|mugging|hold.?up|missing property|lost property|(?:na)?nakaw(?:an|in)?)\b/i,
  assault: /\b(assault|attacked|struck|hit|injured|stabbed|slapped|mauled|punched|beaten)\b/i,
  burglary: /\b(burglary|broke into|break-in|forced entry)\b/i,
  traffic: /\b(traffic|collision|vehicle crash|road accident|accident)\b/i,
  vandalism: /\b(vandalism|vandalized|property damage|graffiti|defaced)\b/i,
  disturbance: /\b(disturbance|disorderly|noise complaint|altercation|commotion)\b/i,
  fraud: /\b(fraud|scam|estafa|con|deception|unauthorized transaction|identity theft)\b/i,
  other: /\b(other)\b/i,
};

function supportedDate(source, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const aliases = [value, `${month}/${day}/${year}`, `${day}/${month}/${year}`, `${monthName} ${day}, ${year}`, `${day} ${monthName} ${year}`];
  return aliases.some((alias) => normalizeForSupport(source).includes(normalizeForSupport(alias)));
}

const normalizeForSupport = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

function supportedTime(source, value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return false;
  const twelveHour = hour % 12 || 12;
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  return [value, `${twelveHour}:${String(minute).padStart(2, '0')} ${meridiem}`].some((alias) => normalizeForSupport(source).includes(normalizeForSupport(alias)));
}

function safeDerivedText(context, value) {
  if (!value) return true;
  const analysis = factualConsistencyValidation({ ...context, people: [] }, value);
  return !analysis.newProtectedValues.length && !analysis.unsupportedLabels.length && !analysis.unsupportedConclusions.length && !analysis.unsupportedCompletedActions.length && !analysis.possibleContradictions.length && !analysis.changedDescriptions.length;
}

function sanitizeGeneratedReportFields(context, generated) {
  const source = sourceText(context);
  const draft = { ...generated };
  const issues = [];
  const reject = (field, message) => { draft[field] = ''; issues.push({ category: 'AI_REPORT_FIELD_UNSUPPORTED', field, message }); };
  const canonical = {
    title: context.title, incident_type: context.incidentType, incident_date: context.incidentDate,
    incident_time: context.incidentTime, location: context.location, summary: context.summary,
    complainant: context.people.find((person) => person.type === 'complainant')?.name,
    victim: context.people.find((person) => person.type === 'victim')?.name,
    suspect: context.people.find((person) => person.type === 'suspect')?.name,
    witness: context.people.find((person) => person.type === 'witness')?.name,
  };
  const type = String(draft.incident_type || '').toLowerCase().trim();
  draft.incident_type = ({ 'traffic incident': 'traffic' })[type] || type;
  if (!canonical.incident_type && draft.incident_type && (!INCIDENT_TYPE_PATTERNS[draft.incident_type] || !INCIDENT_TYPE_PATTERNS[draft.incident_type].test(source))) reject('incident_type', 'The proposed incident type was not explicitly supported by the source narrative.');
  if (!canonical.incident_date && draft.incident_date && !supportedDate(source, draft.incident_date)) reject('incident_date', 'The proposed incident date was not explicitly supported by the source narrative.');
  if (!canonical.incident_time && draft.incident_time && !supportedTime(source, draft.incident_time)) reject('incident_time', 'The proposed incident time was not explicitly supported by the source narrative.');
  if (!canonical.location && draft.location && !normalizeForSupport(source).includes(normalizeForSupport(draft.location))) reject('location', 'The proposed location was not explicitly supported by the source narrative.');
  for (const role of ['complainant', 'victim', 'suspect', 'witness']) {
    if (canonical[role] || !draft[role]) continue;
    const namedSentence = sentences(source).find((sentence) => normalizeForSupport(sentence).includes(normalizeForSupport(draft[role])));
    if (!namedSentence || !hasTerm(namedSentence, role)) reject(role, `The proposed ${role} role was not explicitly attached to that person in the source narrative.`);
  }
  for (const field of ['title', 'summary']) if (!canonical[field] && draft[field] && !safeDerivedText(context, draft[field])) reject(field, `The proposed ${field} contained a factual claim not safely supported by the source narrative.`);
  return { draft: mergeCanonicalReportFields(context, draft), issues };
}

function mergeCanonicalReportFields(context, generated) {
  return {
    ...generated,
    title: context.title || generated.title,
    incident_type: context.incidentType || generated.incident_type,
    incident_date: context.incidentDate || generated.incident_date,
    incident_time: context.incidentTime || generated.incident_time,
    location: context.location || generated.location,
    summary: context.summary || generated.summary,
    complainant: context.people.find((person) => person.type === 'complainant')?.name || generated.complainant,
    victim: context.people.find((person) => person.type === 'victim')?.name || generated.victim,
    suspect: context.people.find((person) => person.type === 'suspect')?.name || generated.suspect,
    witness: context.people.find((person) => person.type === 'witness')?.name || generated.witness,
  };
}

function generationPrompt(action, structuredFacts, writingRequest, correctionIssues = []) {
  const correction = correctionIssues.length
    ? `\n\nCORRECTION_REQUIRED\nThe prior draft failed deterministic validation. Produce one corrected draft from STRUCTURED_FACTS only. Do not copy the prior draft. Re-check these constraint categories against the structured object:\n${[...new Set(correctionIssues.map((finding) => finding.category))].map((category) => `- ${category}`).join('\n')}\nCORRECTION_REQUIRED_END`
    : '';
  return `${ACTIONS[action].instruction}\n\nWRITING_REQUEST_START\n${writingRequest.combined || 'No additional writing preference supplied.'}\nWRITING_REQUEST_END\n\nSTRUCTURED_FACTS_START\n${JSON.stringify(structuredFacts)}\nSTRUCTURED_FACTS_END${correction}`;
}

function publicFacts(facts) {
  return {
    schema_version: facts.schema_version,
    incident: facts.incident,
    persons: facts.persons.map(({ id, name, locked_role, source_attribution, age, sex, address, description }) => ({ id, name, locked_role, source_attribution, age, sex, address, description })),
    property: facts.property,
    observations: facts.observations,
    officer_actions: facts.officer_actions,
    evidence: facts.evidence,
    pending_actions: facts.pending_actions,
    uncertainties: facts.uncertainties,
    conflicts: facts.conflicts,
    duplicateFactsRemoved: facts.source_segments.reduce((total, segment) => total + Math.max(0, segment.duplicate_count - 1), 0),
  };
}

async function generateReportAssistance({ action, report, formData, writingInstruction = '', presetKeys = [] }) {
  const context = buildReportContext(report, formData);
  validateContext(action, context);
  const writingRequest = resolveWritingRequest(presetKeys, writingInstruction);
  const config = providerConfig();

  try {
    const structuredFacts = buildStructuredFacts(context);
    const generationFacts = cleanFactsForGeneration(structuredFacts);
    const structuredOutput = action === 'generate';
    let suggestion = await requestCompletion(config, [
      { role: 'system', content: action === 'check' ? CHECK_SYSTEM_INSTRUCTION : (structuredOutput ? REPORT_DRAFT_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION) },
      { role: 'user', content: generationPrompt(action, generationFacts, writingRequest) },
    ], structuredOutput ? { responseMimeType: 'application/json', responseJsonSchema: REPORT_DRAFT_SCHEMA } : {});
    if (action === 'check') {
      return { action, suggestion, originalRawNotes: context.narrative, appliedWritingRequest: writingRequest.combined, appliedPresetKeys: writingRequest.presetKeys, structuredFacts: publicFacts(structuredFacts), retryCount: 0, reviewReady: true, validation: { valid: true, issues: [], unsupported_details: [], role_conflicts: [], confidence: 1 }, factAnalysis: { hasWarning: false, categories: [], newProtectedValues: [], missingSuppliedNames: [] }, aiProvider: 'Google AI Studio', aiModel: config.model };
    }

    let reportFieldIssues = [];
    let reportDraft = null;
    if (structuredOutput) {
      const sanitized = sanitizeGeneratedReportFields(context, parseReportDraft(suggestion));
      reportDraft = sanitized.draft;
      reportFieldIssues = sanitized.issues;
    }
    if (structuredOutput) suggestion = reportDraft.narrative;
    const initialRawSuggestion = suggestion;
    suggestion = normalizeNarrativeOutput(suggestion);
    let outputFormatCorrected = initialRawSuggestion.trim() !== suggestion;
    let legacyAnalysis = factualConsistencyValidation(context, suggestion);
    let validation = validateDraft(structuredFacts, suggestion, legacyAnalysis);
    const initialValidation = validation;
    let retryCount = 0;
    let retryTimedOut = false;
    if (!validation.valid) {
      retryCount = 1;
      try {
        suggestion = await requestCompletion({ ...config, timeoutMs: Math.min(config.timeoutMs, 45000) }, [
          { role: 'system', content: structuredOutput ? REPORT_DRAFT_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION },
          { role: 'user', content: generationPrompt(action, generationFacts, writingRequest, validation.issues) },
        ], structuredOutput ? { responseMimeType: 'application/json', responseJsonSchema: REPORT_DRAFT_SCHEMA } : {});
        if (structuredOutput) {
          const sanitized = sanitizeGeneratedReportFields(context, parseReportDraft(suggestion));
          reportDraft = sanitized.draft;
          reportFieldIssues = sanitized.issues;
          suggestion = reportDraft.narrative;
        }
        const retryRawSuggestion = suggestion;
        suggestion = normalizeNarrativeOutput(suggestion);
        outputFormatCorrected = outputFormatCorrected || retryRawSuggestion.trim() !== suggestion;
        legacyAnalysis = factualConsistencyValidation(context, suggestion);
        validation = validateDraft(structuredFacts, suggestion, legacyAnalysis);
      } catch (error) {
        if (error.code !== 'GOOGLE_AI_TIMEOUT') throw error;
        retryTimedOut = true;
      }
    }

    const safetyFiltered = false;
    const extractionCategories = [...new Set((structuredFacts.conflicts || []).map((conflict) => conflict.category))];
    const categories = [...new Set([...auditCategories(initialValidation), ...auditCategories(validation), ...extractionCategories, ...(outputFormatCorrected ? ['AI_OUTPUT_FORMAT_MISMATCH'] : [])])];
    const reviewReady = validation.valid && Boolean(suggestion);
    const reportFieldCategories = reportFieldIssues.length ? ['AI_REPORT_FIELD_UNSUPPORTED'] : [];
    const factAnalysis = { ...legacyAnalysis, hasWarning: reportFieldIssues.length > 0 || extractionCategories.length > 0 || outputFormatCorrected || retryCount > 0 || !reviewReady || legacyAnalysis.hasWarning || safetyFiltered, categories: [...new Set([...(legacyAnalysis.categories || []), ...categories, ...reportFieldCategories])], validationCategories: [...new Set([...categories, ...reportFieldCategories])], autoCorrected: outputFormatCorrected || retryCount > 0 || legacyAnalysis.autoCorrected || safetyFiltered, safetyFiltered };
    const correction = { attempted: retryCount === 1, initialIssues: initialValidation.issues, safetyFiltered, retryTimedOut, outputFormatCorrected };
    if (structuredOutput) reportDraft = { ...reportDraft, narrative: suggestion };
    return { action, suggestion, reportDraft, reportFieldIssues, originalRawNotes: context.narrative, appliedWritingRequest: writingRequest.combined, appliedPresetKeys: writingRequest.presetKeys, structuredFacts: publicFacts(structuredFacts), retryCount, reviewReady, validation, correction, factAnalysis, aiProvider: 'Google AI Studio', aiModel: config.model };
  } catch (error) {
    if (error.status || error.code) throw error;
    throw Object.assign(new Error('AI report generation is temporarily unavailable.'), { status: 503, code: 'GOOGLE_AI_UNAVAILABLE' });
  }
}

// ── Guided Q&A field extraction ─────────────────────────────────────────────────
// Structures an officer's chat answer into report fields. Structured output only;
// every returned value must be supported by the officer's own message.
const EXTRACT_FIELDS = ['incident_type', 'location', 'incident_date', 'incident_time', 'complainant', 'victim', 'suspect', 'witness', 'summary', 'narrative'];
const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: EXTRACT_FIELDS,
  properties: Object.fromEntries(EXTRACT_FIELDS.map((field) => [field, { type: 'string' }])),
};

function parseExtractedFields(value) {
  let parsed;
  try { parsed = JSON.parse(String(value || '').replace(/^```json\s*|```$/gi, '').trim()); } catch { parsed = null; }
  return Object.fromEntries(EXTRACT_FIELDS.map((field) => [field, text(parsed?.[field], field === 'narrative' ? 12000 : 500)]));
}

// Post-model guard: every extracted value must be traceable to the officer's message.
// Relative wording ("last night", "around 9pm") is accepted as the source for an
// AI-resolved absolute date/time — the officer stated it, the model only converted it.
function verifyExtractedFields(message, extracted) {
  const issues = [];
  const source = normalizeForSupport(message);
  const type = String(extracted.incident_type || '').toLowerCase().trim();
  const relativeDateWording = /\b(today|yesterday|last night|tonight|this morning|this afternoon|this evening|last week|earlier|kahapon|kagabi|kanina|ngayong umaga)\b/i;
  const relativeTimeWording = /(?:\b\d{1,2}\s*(?::\d{2}|\s?(?:am|pm)|o'?clock)\b)|(?:\b(?:at|around|about|near)\s+\d{1,2}\b)/i;
  const validIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(String(extracted.incident_date || ''));
  const validTime = /^\d{2}:\d{2}$/.test(String(extracted.incident_time || ''));

  if (type) {
    if (!INCIDENT_TYPE_PATTERNS[type] || !INCIDENT_TYPE_PATTERNS[type].test(message)) {
      extracted.incident_type = '';
      issues.push('incident_type not stated in message');
    }
  }
  if (extracted.incident_date && !validIsoDate) {
    extracted.incident_date = '';
    issues.push('incident_date not a valid YYYY-MM-DD value');
  }
  if (extracted.incident_time && !validTime) {
    extracted.incident_time = '';
    issues.push('incident_time not a valid HH:MM value');
  }
  if (extracted.location && !source.includes(normalizeForSupport(extracted.location))) {
    extracted.location = '';
    issues.push('location not stated in message');
  }
  for (const role of ['complainant', 'victim', 'suspect', 'witness']) {
    const name = String(extracted[role] || '').trim();
    if (name && !source.includes(normalizeForSupport(name))) {
      extracted[role] = '';
      issues.push(`${role} not stated in message`);
    }
  }
  return { extracted, issues };
}

async function extractReportFields({ message, knownFields = {}, currentDate }) {
  const officerMessage = text(message, 4000);
  if (!officerMessage) throw Object.assign(new Error('Message is required.'), { status: 400, code: 'INVALID_ACTION' });

  // Preferred path: fully local extraction via Ollama (no cloud, no quota, no data leaves the server).
  const local = await tryOllamaExtraction(officerMessage, knownFields, currentDate);
  if (local) return local;

  // Cloud path (existing Gemini integration) — used only when Ollama is not reachable.
  const config = providerConfig();
  const known = Object.fromEntries(EXTRACT_FIELDS.map((field) => [field, text(knownFields[field], 500)]));
  const prompt = [
    ACTIONS.extract.instruction,
    '',
    `CURRENT_DATE: ${text(currentDate, 10) || new Date().toISOString().split('T')[0]}`,
    `KNOWN_FIELDS (already captured — do not repeat these): ${JSON.stringify(known)}`,
    `MESSAGE: ${officerMessage}`,
  ].join('\n');
  try {
    const raw = await requestCompletion(config, [
      { role: 'system', content: ACTIONS.extract.instruction },
      { role: 'user', content: prompt },
    ], { responseMimeType: 'application/json', responseJsonSchema: EXTRACT_SCHEMA });
    const { extracted, issues } = verifyExtractedFields(officerMessage, parseExtractedFields(raw));
    return {
      extracted: Object.fromEntries(Object.entries(extracted).filter(([, value]) => value)),
      issues,
      aiProvider: 'Google AI Studio',
      aiModel: config.model,
    };
  } catch (error) {
    if (error.status || error.code) throw error;
    throw Object.assign(new Error('AI field extraction is temporarily unavailable.'), { status: 503, code: 'GOOGLE_AI_UNAVAILABLE' });
  }
}

// ── Ollama (local) extraction ──────────────────────────────────────────────
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const OLLAMA_TIMEOUT_MS = Math.min(60000, Math.max(2000, Number(process.env.OLLAMA_TIMEOUT_MS || 20000)));
let ollamaDownUntil = 0; // backoff: if Ollama is unreachable, don't re-probe on every message

function ollamaConfigured() {
  return process.env.OLLAMA_ENABLED !== 'false';
}

async function tryOllamaExtraction(officerMessage, knownFields, currentDate) {
  if (!ollamaConfigured() || Date.now() < ollamaDownUntil) return null;
  const known = Object.fromEntries(EXTRACT_FIELDS.map((field) => [field, text(knownFields[field], 500)]));
  const prompt = [
    ACTIONS.extract.instruction,
    '',
    `CURRENT_DATE: ${text(currentDate, 10) || new Date().toISOString().split('T')[0]}`,
    `KNOWN_FIELDS (already captured — do not repeat these): ${JSON.stringify(known)}`,
    `MESSAGE: ${officerMessage}`,
  ].join('\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 400 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const data = await response.json();
    ollamaDownUntil = 0; // reachable — keep preferring it
    const { extracted, issues } = verifyExtractedFields(officerMessage, parseExtractedFields(data?.response));
    return {
      extracted: Object.fromEntries(Object.entries(extracted).filter(([, value]) => value)),
      issues,
      aiProvider: 'Ollama (local)',
      aiModel: OLLAMA_MODEL,
    };
  } catch {
    // Unreachable/failed — back off for 5 minutes so each officer message doesn't wait for a timeout.
    ollamaDownUntil = Date.now() + 5 * 60 * 1000;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { ACTIONS, WRITING_PRESETS, WRITING_REQUEST_REFUSAL, SYSTEM_INSTRUCTION, CHECK_SYSTEM_INSTRUCTION, REPORT_DRAFT_SYSTEM_INSTRUCTION, REPORT_DRAFT_SCHEMA, parseReportDraft, mergeCanonicalReportFields, sanitizeGeneratedReportFields, resolveWritingRequest, analyzeProtectedFacts, factualConsistencyValidation, buildReportContext, validateContext, requestCompletion, generationPrompt, generateReportAssistance, extractReportFields };