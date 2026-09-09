// Deterministic safeguards that remain independent of the language model.
// The language glossary is static data (no model calls) and provides the
// cross-language bridge so translated output is not flagged as invented.
const { UNCERTAINTY_EQUIVALENTS, uncertaintySurvived } = require('../prompts/languageGlossary');
const text = (value, max = 12000) => String(value ?? '').trim().slice(0, max);
const sentenceList = (value) => text(value, 30000).match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map((part) => part.trim()).filter(Boolean) || [];
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasTerm = (value, term) => new RegExp(`\\b${escapeRegex(term).replace(/\s+/g, '\\s+')}\\b`, 'i').test(String(value));

const FACT_SCHEMA = Object.freeze({
  incident: { type: '', date: '', time: '', location: '' },
  persons: [{ id: '', name: '', locked_role: '', source_attribution: '', age: null, sex: '', address: '', description: [], statements: [] }],
  events: [], property: [], observations: [], officer_actions: [], evidence: [], pending_actions: [], uncertainties: [], conflicts: [], source_segments: [],
});

const CLOTHING = ['cap', 'hat', 'shirt', 'jacket', 'hoodie', 'pants', 'shorts', 'shoes', 'dress', 'uniform', 't-shirt', 'tee', 'coat', 'vest'];
const UNCERTAINTY = ['not sure', 'not certain', 'not confirmed', 'possibly', 'possible', 'around', 'approximately', 'approximate', 'about', 'appeared', 'appears', 'may', 'might', 'could', 'unknown', 'estimated', 'reportedly', 'allegedly', 'believes', 'believed', 'unconfirmed', 'alleged', 'claimed', ...Object.keys(UNCERTAINTY_EQUIVALENTS)];
const PENDING = /\b(not yet|has not|hasn't|have not|could not|couldn't|unable to|unavailable|will (?:be|review|follow)|tomorrow|pending|to be reviewed|for follow-up|not been|still for review)\b/i;
const COMPLETED = /\b(reviewed|obtained|collected|recovered|confirmed|verified|interviewed|arrested|seized|located)\b/i;
const ACTION = /\b(responded|arrived|observed|noticed|requested|advised|informed|checked|searched|patrolled|questioned|interviewed|confiscated|documented|examined|secured|canvassed|reviewed|obtained|collected|recovered|confirmed|verified|arrested|seized|located)\b/i;
const EVIDENCE = /\b(cctv|footage|evidence|weapon|recovered|seized|collected|photograph|photo|recording)\b/i;
const PROPERTY = /\b(wallet|motorcycle|phone|cellphone|bag|purse|bicycle|tricycle|vehicle|car|item|property|laptop|jewelry|jewellery|cash|money|gun|firearm|knife|bolo|shabu)\b/i;
const OBSERVATION = /\b(saw|observed|noticed|standing|walking|leaving|near|toward|heading toward)\b/i;
const ROLE_WORD = /\b(suspect|offender|perpetrator|complainant|victim|witness|person of interest)\b/gi;
const GUILT = /\b(guilty|intentionally|deliberately|committed the theft|stole the)\b/i;
const FORMAT_HEADING = /^(?:summary|victim|witness(?:es)?|suspect|investigation|follow[- ]?up|area checked|evidence|cctv)\s*:?\s*$/i;
const FORMAT_PREFIX = /^(?:summary|victim|witness(?:es)?|suspect|investigation|follow[- ]?up|area checked|evidence|cctv|narrative\s*\d+)\s*:\s*/i;
const FORMAT_INLINE_LABEL = /(?:^|\s)(?:summary|victim|witness(?:es)?|suspect|investigation|follow[- ]?up|area checked|evidence|cctv|narrative\s*\d+)\s*:\s*/gi;
const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this', 'it', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'he', 'she', 'they', 'his', 'her', 'their', 'said', 'stated', 'reported']);

function unique(values) {
  return [...new Map(values.filter(Boolean).map((value) => [String(value).toLowerCase(), String(value)])).values()];
}

function cleanSourceSentence(value) {
  return text(value, 3000).replace(/^\s*narrative\s*\d+\s*:\s*/i, '').trim();
}

function factTokens(value) {
  return normalize(cleanSourceSentence(value)).split(' ').filter((token) => token && !STOP_WORDS.has(token));
}

function criticalSignature(value) {
  const source = String(value || '');
  const protectedValues = source.match(/(?:₱|PHP\s*|\$)\s*\d[\d,.]*|\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b|\b\d{1,2}\s*(?:AM|PM)\b|\b(?:not|no|never|could not|has not|have not|unable|unavailable|possibly|approximately|around|about)\b/gi) || [];
  return protectedValues.map(normalize).sort().join('|');
}

function semanticallyDuplicate(left, right) {
  if (normalize(cleanSourceSentence(left)) === normalize(cleanSourceSentence(right))) return true;
  if (criticalSignature(left) !== criticalSignature(right)) return false;
  const a = new Set(factTokens(left));
  const b = new Set(factTokens(right));
  if (!a.size || !b.size) return false;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.min(a.size, b.size) >= 0.85 && overlap / Math.max(a.size, b.size) >= 0.65;
}

function extractTimeMinutes(value) {
  const match = String(value || '').match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return hour * 60 + Number(match[2] || 0);
}

function explicitTimes(value) {
  return unique((String(value || '').match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/gi) || []).map((time) => time.replace(/\s+/g, ' ').toUpperCase()));
}

// "9:30 PM" → "21:30" — drafts may legitimately use the 24-hour form.
function twentyFourHourAlias(value) {
  const minutes = extractTimeMinutes(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function factSimilarity(left, right) {
  const a = new Set(factTokens(left));
  const b = new Set(factTokens(right));
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.min(a.size, b.size);
}

function withoutTimes(value) {
  return String(value || '').replace(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/gi, ' ');
}

function entityIdentity(value) {
  const generic = String(value || '').match(/\b(unidentified|unknown)\s+(male|female|individual|person)\b/i);
  return normalize(generic ? generic[0] : value);
}

function rolesAdjacentToName(sentence, name) {
  const personPattern = escapeRegex(name).replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`(?:${ROLE_WORD.source})\\s+(?:named\\s+)?${personPattern}|${personPattern}\\s*(?:,|was|is|as)?\\s*(?:the\\s+)?(${ROLE_WORD.source})`, 'gi');
  return unique([...String(sentence || '').matchAll(pattern)].flatMap((match) => (match[0].match(ROLE_WORD) || []).map((role) => lockedRole(role))));
}

function lockedRole(value) {
  const role = String(value || '').toLowerCase().replace(/_/g, ' ');
  if (['complainant', 'victim', 'witness', 'suspect', 'person of interest'].includes(role)) return role;
  return role.includes('unknown') || role.includes('unidentified') || role === 'person observed' ? 'person observed' : 'person involved';
}

function clothingTokens(value) {
  const found = [];
  for (const item of CLOTHING) {
    const pattern = new RegExp(`\\b(?:(black|white|gray|grey|red|blue|green|yellow|brown|orange|purple|pink)\\s+)?(${escapeRegex(item)})(?:\\b|s\\b)`, 'gi');
    for (const match of String(value || '').matchAll(pattern)) found.push({ item: match[2].toLowerCase(), color: match[1]?.toLowerCase() || '', value: match[0].toLowerCase() });
  }
  return found;
}

function descriptionTokens(value) {
  const ages = [...String(value || '').matchAll(/\b(?:(?:approximately|about|around|estimated)\s+)?\d{1,3}(?:\s*(?:-|–|to)\s*\d{1,3})?\s*(?:years?\s+old|year-old)\b/gi)].map((match) => match[0].toLowerCase());
  return unique([...clothingTokens(value).map((item) => item.value), ...ages]);
}

function buildStructuredFacts(context) {
  const rawNarrative = text(context.narrative, 12000);
  const sourceSegments = [];
  let sourceOrder = 0;
  const addSegments = (value, attribution, sourceRef) => sentenceList(value).forEach((rawContent, index) => {
    const content = cleanSourceSentence(rawContent);
    if (!content || FORMAT_HEADING.test(content)) return;
    sourceOrder += 1;
    const duplicate = sourceSegments.find((segment) => semanticallyDuplicate(segment.content, content));
    if (duplicate) {
      duplicate.source_refs.push(`${sourceRef}-${index + 1}`);
      duplicate.attributions = unique([...duplicate.attributions, attribution]);
      duplicate.duplicate_count += 1;
      return;
    }
    sourceSegments.push({ id: `fact-${sourceOrder}`, content, attribution, attributions: [attribution], source_refs: [`${sourceRef}-${index + 1}`], duplicate_count: 1, source_order: sourceOrder, time_minutes: extractTimeMinutes(content), action_status: PENDING.test(content) ? 'pending_or_unavailable' : (ACTION.test(content) ? 'completed_or_observed' : 'stated_fact') });
  });
  addSegments(rawNarrative, 'officer_notes', 'narrative');
  addSegments(context.summary, 'report_summary', 'summary');
  // Concise-form structured inputs: every short officer-entered fact becomes a
  // sourced segment so §I–VI generation can use it (attributed, validated for
  // support like narrative text — never treated as invented).
  const details = (context.details && typeof context.details === 'object') ? context.details : {};
  const DETAIL_ATTRIBUTIONS = {
    blotter_entry_no: 'officer_structured_input',
    evidence_description: 'officer_structured_input',
    actions_taken: 'officer_structured_input',
    witness_statement: 'officer_structured_input',
  };
  for (const [key, val] of Object.entries(details)) {
    const content = cleanSourceSentence(String(val || ''));
    if (!content || FORMAT_HEADING.test(content)) continue;
    sourceOrder += 1;
    const attribution = DETAIL_ATTRIBUTIONS[key] || 'officer_structured_input';
    const duplicate = sourceSegments.find((segment) => semanticallyDuplicate(segment.content, content));
    if (duplicate) {
      duplicate.source_refs.push(`detail-${key}`);
      duplicate.attributions = unique([...duplicate.attributions, attribution]);
      duplicate.duplicate_count += 1;
      continue;
    }
    sourceSegments.push({ id: `fact-${sourceOrder}`, content, attribution, attributions: [attribution], source_refs: [`detail-${key}`], duplicate_count: 1, source_order: sourceOrder, time_minutes: extractTimeMinutes(content), action_status: PENDING.test(content) ? 'pending_or_unavailable' : (ACTION.test(content) ? 'completed_or_observed' : 'stated_fact') });
  }

  const persons = [];
  const byName = new Map();
  const conflicts = [];
  const addPerson = (input) => {
    const name = text(input.name, 250);
    const key = entityIdentity(name);
    if (!key) return;
    const role = lockedRole(input.type);
    let person = byName.get(key);
    if (!person) {
      const related = sentenceList(rawNarrative).filter((part) => normalize(part).includes(key));
      const genericIdentity = /\b(unidentified|unknown)\s+(male|female|individual|person)\b/i.test(name);
      // Legacy storage artifact: single names were once saved with a fabricated
      // "Unknown" last name ("SHAINE Unknown"). The draft should never be forced
      // to write that placeholder, so validate against the real name only.
      const legacyUnknown = name.match(/^([^,]+?)\s+Unknown$/i);
      const displayName = legacyUnknown ? legacyUnknown[1] : (genericIdentity ? name.match(/\b(unidentified|unknown)\s+(male|female|individual|person)\b/i)[0] : name);
      const personText = [genericIdentity ? name : '', input.statement, input.notes].filter(Boolean).join(' ');
      const narrativeDescriptions = role === 'person observed' ? related.flatMap(descriptionTokens) : [];
      person = { id: `person-${persons.length + 1}`, name: displayName, locked_role: role, source_attribution: role, age: Number.isFinite(input.age) ? input.age : null, sex: text(input.sex, 20), address: text(input.address, 500), description: unique([...descriptionTokens(personText), ...narrativeDescriptions]), statements: unique([input.statement, input.notes].filter(Boolean).map((value) => text(value, 2000))), role_sources: [{ role, source: input.source || 'extracted', canonical: Boolean(input.canonical) }] };
      byName.set(key, person);
      persons.push(person);
    } else {
      person.role_sources.push({ role, source: input.source || 'extracted', canonical: Boolean(input.canonical) });
      const canonicalRoles = unique(person.role_sources.filter((entry) => entry.canonical).map((entry) => entry.role).filter((value) => value !== 'person involved'));
      if (canonicalRoles.length > 1 && !conflicts.some((conflict) => conflict.entity === person.name && conflict.field === 'role')) {
        conflicts.push({ category: 'AI_SOURCE_ROLE_CONFLICT', entity: person.name, field: 'role', values: canonicalRoles, message: `Role conflict detected: ${person.name} is identified as ${canonicalRoles.join(' and ')}. Please verify before finalizing.` });
        person.locked_role = 'role disputed';
      }
      if (person.age === null && Number.isFinite(input.age)) person.age = input.age;
      if (!person.sex && input.sex) person.sex = text(input.sex, 20);
      if (!person.address && input.address) person.address = text(input.address, 500);
    }
    if (person.locked_role === 'person involved' && role !== 'person involved') person.locked_role = role;
    addSegments(input.statement, `${person.locked_role}:${person.name}`, `${person.id}-statement`);
    addSegments(input.notes, `${person.locked_role}:${person.name}`, `${person.id}-notes`);
  };
  (Array.isArray(context.people) ? context.people : []).forEach(addPerson);
  for (const match of rawNarrative.matchAll(/\b(unidentified|unknown)\s+(male|female|individual|person)\b/gi)) addPerson({ name: match[0], type: 'person observed' });

  for (const person of persons) {
    const genericObserved = /\b(unidentified|unknown)\s+(male|female|individual|person)\b/i.test(person.name)
      && sentenceList(rawNarrative).some((part) => hasTerm(part, person.name) && OBSERVATION.test(part) && !/\b(suspect|offender|perpetrator)\b/i.test(part));
    if (person.locked_role === 'suspect' && genericObserved) {
      conflicts.push({ category: 'AI_SOURCE_ROLE_CONFLICT', entity: person.name, field: 'role', values: ['suspect', 'person observed'], resolved_by: 'neutral_observation', message: `Role discrepancy detected for ${person.name}; the notes establish observation but not involvement, so BLUEWRITE used the neutral person observed role. Please verify.` });
      person.locked_role = 'person observed';
      person.source_attribution = 'person observed';
    }
    if (person.locked_role === 'role disputed') continue;
    const related = sentenceList(rawNarrative).filter((part) => hasTerm(part, person.name));
    const narrativeRoles = unique(related.flatMap((part) => rolesAdjacentToName(part, person.name)));
    const mismatches = narrativeRoles.filter((role) => role !== person.locked_role);
    if (mismatches.length) conflicts.push({ category: 'AI_SOURCE_ROLE_CONFLICT', entity: person.name, field: 'role', values: unique([person.locked_role, ...mismatches]), resolved_by: 'canonical_role', message: `Role discrepancy detected for ${person.name}; BLUEWRITE retained the canonical ${person.locked_role} role. Please verify.` });
  }

  const narrativeLocations = [...rawNarrative.matchAll(/\b(?:location|at|in)\s*:\s*([^.!?\n]+)/gi)].map((match) => cleanSourceSentence(match[1])).filter(Boolean);
  const location = text(context.location, 500);
  for (const narrativeLocation of unique(narrativeLocations)) {
    if (location && !normalize(location).includes(normalize(narrativeLocation)) && !normalize(narrativeLocation).includes(normalize(location))) conflicts.push({ category: 'AI_SOURCE_LOCATION_CONFLICT', field: 'location', values: [location, narrativeLocation], resolved_by: 'canonical_location', message: `Location discrepancy detected. BLUEWRITE retained the Officer-entered location "${location}". Please verify.` });
  }

  const allSource = sourceSegments.map((segment) => segment.content).join(' ');
  const selectSegments = (pattern) => sourceSegments.filter((segment) => pattern.test(segment.content)).map((segment) => ({ detail: segment.content, source_ref: segment.id }));
  return {
    schema_version: 2,
    source_policy: 'Only source_segments and normalized fields derived from them may be used. Roles, descriptions, uncertainty, and action statuses are locked.',
    incident: { type: text(context.incidentType, 100), date: text(context.incidentDate, 20), time: text(context.incidentTime, 20), location },
    persons: persons.filter((person) => person.locked_role !== 'role disputed').map(({ role_sources, ...person }) => person),
    events: [...sourceSegments].sort((left, right) => {
      if (left.time_minutes !== null && right.time_minutes !== null) return left.time_minutes - right.time_minutes;
      if (left.time_minutes !== null) return -1;
      if (right.time_minutes !== null) return 1;
      return left.source_order - right.source_order;
    }).map(({ content, attribution, action_status, time_minutes, id }) => ({ id, time: time_minutes, attribution, action_status, fact: content })),
    property: selectSegments(PROPERTY),
    observations: selectSegments(OBSERVATION),
    officer_actions: sourceSegments.filter((segment) => segment.action_status === 'completed_or_observed').map((segment) => ({ detail: segment.content, status: segment.action_status, source_ref: segment.id })),
    evidence: selectSegments(EVIDENCE),
    pending_actions: sourceSegments.filter((segment) => segment.action_status === 'pending_or_unavailable').map((segment) => ({ detail: segment.content, status: segment.action_status, source_ref: segment.id })),
    // "mga" is normally the Filipino plural marker ("mga biktima" = "the
    // victims"), not a hedge. It only signals approximation directly before a
    // number or clock expression ("mga 5", "mga alas-3").
    uncertainties: UNCERTAINTY.filter((term) => (term === 'mga' ? /\bmga\s+(?:alas[-\s]?\S+|\d)/i.test(allSource) : hasTerm(allSource, term))),
    conflicts,
    source_segments: sourceSegments,
  };
}

function cleanFactsForGeneration(facts) {
  const unresolvedEntities = (facts.conflicts || []).filter((conflict) => !conflict.resolved_by && conflict.entity).map((conflict) => conflict.entity);
  const conflictingLocations = (facts.conflicts || []).filter((conflict) => conflict.field === 'location').flatMap((conflict) => conflict.values.slice(1));
  const safeEvents = facts.events.filter((event) => {
    if (unresolvedEntities.some((name) => hasTerm(event.fact, name))) return false;
    if (conflictingLocations.some((location) => normalize(location) && normalize(event.fact).includes(normalize(location)))) return false;
    return true;
  });
  // Explicit checklist for the model: small models reliably include facts they
  // see as a named requirement, but silently drop trailing source sentences.
  const coverage_required = [];
  for (const person of facts.persons) {
    coverage_required.push(`${person.name} (${person.locked_role})${person.statements?.length ? ` — must be reported with their statement: ${person.statements.join(' ')}` : ' — must be mentioned'}`);
  }
  for (const pending of facts.pending_actions || []) coverage_required.push(`Pending/unavailable — must NOT be presented as completed: ${pending.detail}`);
  const uniqueUncertainties = [...new Set(facts.uncertainties)];
  if (uniqueUncertainties.length) coverage_required.push(`Keep these uncertainty markers in the narrative wording: ${uniqueUncertainties.join(', ')}`);

  // Short structured inputs surfaced for the model as a labeled map so the
  // generate prompt can use every officer-entered fact (blotter no., evidence,
  // actions taken, case status, type-specific fields, ...).
  const detailFacts = (facts.source_segments || [])
    .filter((segment) => (segment.source_refs || []).some((ref) => String(ref).startsWith('detail-')))
    .map((segment) => ({ detail: segment.content, ref: segment.source_refs.find((ref) => String(ref).startsWith('detail-')), attribution: segment.attribution, action_status: segment.action_status }));

  return {
    schema_version: facts.schema_version,
    output_contract: 'Return numbered-paragraph narrative prose ("1. … 2. … 3. …"). No headings, labels, JSON, analysis, or validation messages. Cover every fact listed below in complete, formal sentences, and satisfy every item in coverage_required.',
    incident: facts.incident,
    detail_facts: detailFacts,
    persons: facts.persons.map(({ id, name, locked_role, source_attribution, age, sex, address, description, statements }) => ({ id, name, locked_role, source_attribution, age, sex, address, description, statements })),
    events: safeEvents,
    property: facts.property,
    evidence: facts.evidence,
    pending_actions: facts.pending_actions,
    uncertainties: [...new Set(facts.uncertainties)],
    coverage_required,
  };
}

function issue(category, message, sentence = '', removable = false) {
  return { category, message, sentence, removable };
}

// Meta-commentary patterns: sentences where a small model narrates the task
// ("the report covers all the facts...") instead of the incident itself.
// Removing these is deterministic cleanup, never fact removal — every fact in a
// meta sentence also appears as a real sentence elsewhere in the source facts.
const META_COMMENTARY = /(?:\b(?:report|narrative|draft|output|response)\s+(?:is\s+one|covers|includes|ensures|contains|summarizes)|\buncertainties?\s+include\b|\bthe\s+pending\s+action\s+is\b|\bcoverage_required\b|\bmust\s+be\s+(?:mentioned|reported)\b|\bno\s+facts\s+(?:were\s+)?invented\b|\bwithout\s+inventing\b)/i;

function normalizeNarrativeOutput(value) {
  const lines = text(value, 20000).replace(/```(?:text|markdown)?/gi, '').replace(/```/g, '').split(/\r?\n/);
  const prose = [];
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || FORMAT_HEADING.test(line)) continue;
    line = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').replace(FORMAT_PREFIX, '').replace(FORMAT_INLINE_LABEL, ' ').trim();
    if (!line) continue;
    if (META_COMMENTARY.test(line)) {
      // Drop only the offending sentences, keep the rest of the line.
      const kept = sentenceList(line).filter((sentence) => !META_COMMENTARY.test(sentence));
      if (!kept.length) continue;
      line = kept.join(' ');
    }
    prose.push(line);
  }
  // Collapse degenerate repetition loops (a small model failure mode where one
  // sentence repeats until the token budget is exhausted). Exact consecutive
  // duplicates carry no additional fact, so dropping them is safe.
  const sentences = [];
  for (const part of prose) for (const sentence of sentenceList(part)) {
    if (sentences.length && normalize(sentences[sentences.length - 1]) === normalize(sentence)) continue;
    sentences.push(sentence);
  }
  // Rule 11 requires duplicate meaning to be removed; enforce it deterministically
  // by dropping later sentences that are semantic duplicates of an earlier one.
  const deduped = [];
  for (const sentence of sentences) {
    if (deduped.some((prior) => semanticallyDuplicate(prior, sentence))) continue;
    deduped.push(sentence);
  }
  return deduped.join(' ').replace(/\s+/g, ' ').trim();
}

function validateDraft(facts, draft, legacy = {}) {
  const output = text(draft, 20000);
  const source = facts.source_segments.map((segment) => segment.content).join(' ');
  const issues = [];
  const roleConflicts = [];
  const unsupportedDetails = [];
  const suppliedClothing = clothingTokens(source);
  const rawLines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rawLines.some((line) => FORMAT_HEADING.test(line) || FORMAT_PREFIX.test(line) || /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))) issues.push(issue('AI_OUTPUT_FORMAT_MISMATCH', 'The output contains a heading, labeled section, narrative label, or bullet instead of narrative prose.'));
  if (/\n\s*\n/.test(output)) issues.push(issue('AI_OUTPUT_FORMAT_MISMATCH', 'The output contains multiple paragraphs instead of one continuous narrative.'));

  const outputSentences = sentenceList(output);
  for (let index = 0; index < outputSentences.length; index += 1) {
    const duplicate = outputSentences.slice(0, index).find((prior) => semanticallyDuplicate(prior, outputSentences[index]));
    if (duplicate) issues.push(issue('AI_DUPLICATE_FACT', 'The generated narrative repeats a semantically duplicate fact.', outputSentences[index], true));
  }

  for (const sentence of sentenceList(output)) {
    const draftClothing = clothingTokens(sentence);
    for (const token of draftClothing) {
      const exactSupplied = suppliedClothing.some((supplied) => supplied.item === token.item && (!token.color || supplied.color === token.color));
      if (!exactSupplied) {
        issues.push(issue('AI_DESCRIPTION_MISMATCH', `Draft description "${token.value}" is not locked to the source description.`, sentence, true));
        unsupportedDetails.push(token.value);
      }
    }
    for (const person of facts.persons) {
      if (!hasTerm(sentence, person.name)) continue;
      const personPattern = escapeRegex(person.name).replace(/\s+/g, '\\s+');
      const nearbyRoles = new RegExp(`(?:${ROLE_WORD.source})\\s+(?:named\\s+)?${personPattern}|${personPattern}\\s*(?:,|was|is|as)?\\s*(?:the\\s+)?(${ROLE_WORD.source})`, 'gi');
      const roles = [...sentence.matchAll(nearbyRoles)].flatMap((match) => (match[0].match(ROLE_WORD) || []).map((role) => role.toLowerCase()));
      for (const role of roles) {
        if (lockedRole(role) !== person.locked_role) {
          issues.push(issue('AI_ROLE_MISMATCH', `${person.name} is locked as ${person.locked_role}, not ${role}.`, sentence, true));
          roleConflicts.push({ entity: person.name, locked_role: person.locked_role, draft_role: role });
        }
      }
      const lockedDescriptions = clothingTokens(person.description.join(' '));
      for (const token of draftClothing) {
        const matching = lockedDescriptions.some((locked) => locked.item === token.item && (!token.color || locked.color === token.color));
        if (lockedDescriptions.length && !matching) {
          issues.push(issue('AI_DESCRIPTION_MISMATCH', `${person.name}'s description conflicts with the locked source description.`, sentence, true));
        }
      }
    }
    if (/\b(unidentified|unknown)\s+(male|female|individual|person)\b/i.test(source) && /\b(suspect|offender|perpetrator)\b/i.test(sentence) && !facts.persons.some((person) => person.locked_role === 'suspect')) {
      issues.push(issue('AI_ROLE_MISMATCH', 'An unidentified observed person was changed to a suspect/offender designation.', sentence, true));
      roleConflicts.push({ entity: 'unidentified person', locked_role: 'person observed', draft_role: sentence.match(/suspect|offender|perpetrator/i)?.[0] || 'suspect' });
    }
    if (GUILT.test(sentence) && !GUILT.test(source)) {
      issues.push(issue('AI_UNSUPPORTED_DETAIL', 'The draft adds an unsupported guilt, intent, or responsibility conclusion.', sentence, true));
      unsupportedDetails.push(sentence);
    }
  }

  for (const pending of facts.pending_actions) {
    const anchors = pending.detail.match(/\b(cctv|footage|evidence|weapon|witness|video|recording|interview)\b/gi) || [];
    const conflicting = sentenceList(output).find((sentence) => anchors.some((anchor) => hasTerm(sentence, anchor)) && COMPLETED.test(sentence) && !PENDING.test(sentence));
    if (conflicting) issues.push(issue('AI_ACTION_STATUS_MISMATCH', `Pending or unavailable action was presented as completed: ${pending.detail}`, conflicting, true));
  }
  for (const event of facts.events || []) {
    const eventTimes = explicitTimes(event.fact);
    if (!eventTimes.length) continue;
    // A draft may legitimately render "9:30 PM" as "21:30" — accept either form.
    const acceptedForms = eventTimes.flatMap((time) => [time, twentyFourHourAlias(time)]).filter(Boolean);
    const scored = sentenceList(output)
      .map((sentence, index) => ({ sentence, index, similarity: factSimilarity(withoutTimes(event.fact), withoutTimes(sentence)) }))
      .filter((entry) => entry.similarity >= 0.45);
    if (!scored.length) continue;
    const bestSimilarity = Math.max(...scored.map((entry) => entry.similarity));
    // Accept the event time from (a) any sentence nearly as similar to this
    // event as the best match, or (b) a short time-only sentence adjacent to
    // the best match ("It happened at 9:30 pm.") — long source sentences are
    // often split that way. A time genuinely moved to a different event appears
    // only in sentences matching that other event, so it stays flagged.
    const draftSentences = sentenceList(output);
    const bestIndex = [...scored].sort((left, right) => right.similarity - left.similarity)[0].index;
    const timeOnly = (sentence) => {
      const tokens = factTokens(withoutTimes(sentence));
      return tokens.length <= 2 && /^(it\s+)?(happened|occurred|occurring|at|around|approximately|about)\b/i.test(withoutTimes(sentence).trim());
    };
    const carried = scored.some((entry) => bestSimilarity - entry.similarity <= 0.15 && acceptedForms.some((time) => hasTerm(entry.sentence, time)))
      || draftSentences.some((sentence, index) => Math.abs(index - bestIndex) <= 1 && timeOnly(sentence) && acceptedForms.some((time) => hasTerm(sentence, time)));
    if (!carried) {
      const best = [...scored].sort((left, right) => right.similarity - left.similarity)[0];
      issues.push(issue('AI_CHRONOLOGY_MISMATCH', `Time ${eventTimes.join('/')} was removed from or attached to a different event.`, best.sentence));
    }
  }
  for (const term of facts.uncertainties) {
    // Accept the term itself or its documented English equivalent, so a correct
    // Tagalog/Bisaya → English translation is not flagged as removed.
    if (!uncertaintySurvived(output, term)) issues.push(issue('AI_UNSUPPORTED_DETAIL', `Source uncertainty marker "${term}" may have been removed.`));
  }
  for (const person of facts.persons) {
    // Placeholder names like "Unidentified Male 1" are satisfied by a natural
    // mention ("an unidentified male") in the draft.
    const identifier = /^(unidentified|unknown)\s/i.test(person.name) ? (entityIdentity(person.name) || person.name) : person.name;
    if (!hasTerm(output, identifier)) issues.push(issue('AI_ENTITY_MISMATCH', `Locked entity was omitted: ${person.name}`));
  }
  for (const conflict of facts.conflicts || []) {
    if (!conflict.resolved_by) issues.push(issue(conflict.category, conflict.message));
  }
  for (const value of legacy.newProtectedValues || []) {
    issues.push(issue('AI_UNSUPPORTED_DETAIL', `Unsupported protected value detected: ${value}`, sentenceList(output).find((part) => part.includes(value)) || '', true));
    unsupportedDetails.push(value);
  }
  for (const name of legacy.missingSuppliedNames || []) issues.push(issue('AI_ENTITY_MISMATCH', `Supplied entity was omitted: ${name}`));
  for (const label of legacy.unsupportedLabels || []) issues.push(issue('AI_ROLE_MISMATCH', `Unsupported person designation: ${label}`, sentenceList(output).find((part) => hasTerm(part, label)) || '', true));

  const deduped = [...new Map(issues.map((finding) => [`${finding.category}|${finding.message}|${finding.sentence}`, finding])).values()];
  if (!output) deduped.push(issue('AI_FACT_VALIDATION_FAILED', 'The generated draft is empty.'));
  const confidence = Math.max(0, Number((1 - Math.min(0.9, deduped.length * 0.12 + roleConflicts.length * 0.08)).toFixed(2)));
  return { valid: deduped.length === 0, issues: deduped, unsupported_details: unique(unsupportedDetails), role_conflicts: roleConflicts, confidence };
}

function auditCategories(validation) {
  const categories = unique(validation.issues.map((finding) => finding.category));
  if (!validation.valid) categories.push('AI_FACT_VALIDATION_FAILED');
  return unique(categories);
}

module.exports = { FACT_SCHEMA, buildStructuredFacts, cleanFactsForGeneration, validateDraft, auditCategories, normalizeNarrativeOutput, semanticallyDuplicate, sentenceList, clothingTokens };