// BLUEWRITE — Report submit flow tests (Risk #2 / Risk #5 first increment)
// Covers the deterministic half of the AI report pipeline without a database:
//   1. Officer-entered canonical fields always win over AI-proposed fields
//      (mergeCanonicalReportFields).
//   2. AI-proposed fields that the source narrative does not support are
//      rejected with AI_REPORT_FIELD_UNSUPPORTED issues
//      (sanitizeGeneratedReportFields).
//   3. AI-proposed fields the narrative DOES support survive sanitization.
// Ownership scoping (officer A cannot write officer B's report) is covered
// by authSecurity.test.js at the route layer.

const assert = require('node:assert/strict');
const {
  mergeCanonicalReportFields,
  sanitizeGeneratedReportFields,
} = require('../src/services/aiService');

// --- Helpers ---------------------------------------------------------------

function context(overrides = {}) {
  return {
    reportNumber: 'BW-2026-0001',
    title: '',
    incidentType: '',
    incidentDate: '',
    incidentTime: '',
    location: '',
    summary: '',
    narrative:
      'On September 6, 2026 at 07:15 PM, a theft was reported at the Queens Row shopping mall. ' +
      'The complainant Maria Santos stated that a man took her phone from the counter. ' +
      'No weapon was seen and no injuries were reported.',
    people: [],
    ...overrides,
  };
}

const supportedDraft = {
  title: 'Theft at Queens Row shopping mall',
  incident_type: 'theft',
  incident_date: '2026-09-06',
  incident_time: '19:15',
  location: 'Queens Row shopping mall',
  summary: 'Complainant reported a phone taken from a counter at the mall.',
  narrative: 'A theft occurred at the mall. No weapon was seen.',
};

// --- 1. Canonical merge: officer fields win --------------------------------

{
  const ctx = context({
    title: 'Officer title',
    incidentType: 'theft',
    incidentDate: '2026-09-06',
    incidentTime: '19:15',
    location: 'Officer location',
    summary: 'Officer summary.',
    people: [
      { type: 'complainant', name: 'Maria Santos' },
      { type: 'suspect', name: 'Officer Named Suspect' },
    ],
  });
  const merged = mergeCanonicalReportFields(ctx, {
    title: 'AI title',
    incident_type: 'vandalism',
    incident_date: '2020-01-01',
    incident_time: '03:03',
    location: 'AI location',
    summary: 'AI summary.',
    complainant: 'AI Person',
    suspect: 'AI Suspect',
  });

  assert.equal(merged.title, 'Officer title');
  assert.equal(merged.incident_type, 'theft');
  assert.equal(merged.incident_date, '2026-09-06');
  assert.equal(merged.incident_time, '19:15');
  assert.equal(merged.location, 'Officer location');
  assert.equal(merged.summary, 'Officer summary.');
  assert.equal(merged.complainant, 'Maria Santos');
  assert.equal(merged.suspect, 'Officer Named Suspect');
}
console.log('✓ officer-entered canonical fields win over AI-proposed fields');

// --- 1b. Canonical merge fills blanks instead of overwriting ---------------

{
  const ctx = context({ people: [{ type: 'witness', name: 'Juan Dela Cruz' }] });
  const merged = mergeCanonicalReportFields(ctx, {
    title: '',
    incident_type: 'theft',
    location: '',
    witness: 'Juan Dela Cruz',
  });
  assert.equal(merged.title, '', 'empty officer field stays empty (AI draft had none either)');
  assert.equal(merged.incident_type, 'theft', 'AI value survives when the officer left the field blank');
  assert.equal(merged.witness, 'Juan Dela Cruz');
}
console.log('✓ AI fields survive when the officer left the field blank');

// --- 2. Unsupported AI fields are rejected ---------------------------------

{
  const ctx = context();
  const { draft, issues } = sanitizeGeneratedReportFields(ctx, {
    ...supportedDraft,
    incident_type: 'fraud', // narrative says theft, not fraud
    incident_date: '2025-12-25', // narrative date is September 6, 2026
    incident_time: '03:30', // narrative time is 7:15 PM
    location: 'Moonbase Alpha', // nowhere in the narrative
  });

  const fields = new Set(issues.map((issue) => issue.field));
  for (const field of ['incident_type', 'incident_date', 'incident_time', 'location']) {
    assert.ok(fields.has(field), `expected ${field} to be rejected`);
  }
  for (const issue of issues) {
    assert.equal(issue.category, 'AI_REPORT_FIELD_UNSUPPORTED');
    assert.ok(issue.message.length > 10);
  }
  // Rejected fields must be blanked, not left with the unsupported value.
  assert.equal(draft.incident_type, '');
  assert.equal(draft.incident_date, '');
  assert.equal(draft.incident_time, '');
  assert.equal(draft.location, '');
}
console.log('✓ unsupported AI date/time/type/location fields are rejected and blanked');

// --- 3. Unsupported person-role attachment is rejected ----------------------

{
  const ctx = context();
  const { issues } = sanitizeGeneratedReportFields(ctx, {
    ...supportedDraft,
    suspect: 'Maria Santos', // narrative names her, but never as a suspect
  });
  assert.ok(
    issues.some((issue) => issue.field === 'suspect' && issue.category === 'AI_REPORT_FIELD_UNSUPPORTED'),
    'expected suspect role to be rejected — the narrative never attaches that role to her'
  );
}
console.log('✓ AI-proposed person role not present in the narrative is rejected');

// --- 4. Supported AI fields survive ----------------------------------------

{
  const ctx = context();
  const { draft, issues } = sanitizeGeneratedReportFields(ctx, supportedDraft);
  const fields = issues.map((issue) => issue.field);
  assert.deepEqual(fields, [], `expected no issues for a fully supported draft, got: ${JSON.stringify(issues)}`);
  assert.equal(draft.incident_type, 'theft');
  assert.equal(draft.incident_date, '2026-09-06');
  assert.equal(draft.incident_time, '19:15');
  assert.equal(draft.location, 'Queens Row shopping mall');
}
console.log('✓ narrative-supported AI fields pass through sanitization unchanged');

// --- 5. Canonical values override even during sanitization ------------------

{
  const ctx = context({ incidentType: 'theft', location: 'Officer location' });
  const { draft } = sanitizeGeneratedReportFields(ctx, {
    ...supportedDraft,
    incident_type: 'fraud',
    location: 'Moonbase Alpha',
  });
  assert.equal(draft.incident_type, 'theft', 'canonical type wins in the merged output');
  assert.equal(draft.location, 'Officer location', 'canonical location wins in the merged output');
}
console.log('✓ sanitize + merge together guarantee officer authority over canonical fields');

console.log('Report flow tests passed: canonical merge precedence, unsupported-field rejection, role attachment, and supported-field passthrough.');
