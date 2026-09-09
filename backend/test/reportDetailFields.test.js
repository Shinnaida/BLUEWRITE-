// BLUEWRITE — Incident report detail fields tests (10-section spec)
// Integration test for the structured incident report input fields added for
// the Create flow (POST /api/reports, the endpoint behind
// http://localhost:5173/officer/reports/new):
//   1. A report created with the full 10-section payload persists every
//      section (incident info, complainant, victim, suspect, incident details,
//      property/damage, witness, evidence, police action, reporting officer).
//   2. GET /api/reports/:id round-trips the values (dates/times as ISO strings).
//   3. Blank strings are normalized to NULL (not empty strings).
//   4. PUT /api/reports/:id updates detail fields and leaves untouched fields
//      unchanged (undefined → keep old value).
//   5. The AI draft schema still cannot emit detail fields (officer-authored
//      boundary preserved).
// Requires the local MySQL database with the 20260909 detail-fields migration
// applied (same requirement as authSecurity.test.js).

process.env.NODE_ENV = 'test';
process.env.MAIL_MODE = 'json';
process.env.EMAIL_VERIFICATION_SECRET = 'test-only-email-verification-secret-48265937';
process.env.GEMINI_API_KEY = '';

const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const app = require('../src/app');
const mailService = require('../src/services/mailService');
const { hashPassword } = require('../src/utils/password');
const { REPORT_DRAFT_SCHEMA } = require('../src/services/aiService');
const { TYPE_FIELDS, COMMON_FIELD_MAPPING, REMOVED_TO_COMMON } = require('../src/services/incidentTypeFields');

const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const username = `detailtest_${stamp}`;
const password = 'DetailTest!4826';
const ids = { user: null, officer: null, reports: [] };

function client(baseUrl) {
  let cookie = '';
  return {
    async request(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(options.headers || {}) };
      if (cookie) headers.Cookie = cookie;
      const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      return { status: response.status, body };
    },
  };
}

// Full 10-section payload — the same shape ReportForm.jsx submits from
// /officer/reports/new once the summary panel exposes the new sections.
const detailPayload = {
  // Core fields
  title: 'Detail fields integration test',
  incident_type: 'theft',
  incident_date: '2026-09-09',
  incident_time: '14:30',
  location: 'Rizal Street, Barangay San Isidro',
  summary: 'A cellular phone was stolen from a market stall.',
  narrative: 'A factual integration-test narrative describing the theft of a cellular phone at the market stall on Rizal Street.',
  // 1. Incident information
  date_reported: '2026-09-09',
  time_reported: '15:10',
  barangay: 'San Isidro',
  city: 'Quezon City',
  province: 'Metro Manila',
  specific_place: 'In front of Stall 12, public market',
  // 2. Complainant
  complainant_full_name: 'Juan Dela Cruz',
  complainant_age: '34',
  complainant_sex: 'Male',
  complainant_address: '12 Mabini St., San Isidro, Quezon City',
  complainant_contact_number: '0917 123 4567',
  complainant_role: "Victim's spouse",
  // 3. Victim
  victim_full_name: 'Maria Dela Cruz',
  victim_age: '31',
  victim_sex: 'Female',
  victim_address: '12 Mabini St., San Isidro, Quezon City',
  victim_contact_number: '0918 765 4321',
  victim_injuries: 'None',
  victim_damage_or_loss: 'One cellular phone valued at PHP 15,000.00',
  // 4. Suspect
  suspect_name: 'Unidentified male',
  suspect_alias: 'Dodong',
  suspect_age: '25',
  suspect_sex: 'Male',
  suspect_address: 'Last seen near the market',
  suspect_physical_description: 'Medium build, wearing a red shirt and cap',
  suspect_status: 'At Large',
  // 5. Incident details
  what_happened: 'The suspect took the phone from the counter and fled.',
  people_involved: 'Complainant Juan Dela Cruz; victim Maria Dela Cruz; unidentified suspect.',
  sequence_of_events: '1) Victim left the counter. 2) Suspect took the phone. 3) Suspect fled toward the terminal.',
  actions_of_suspect: 'Grabbed the phone and ran.',
  actions_of_victim: 'Shouted for help and reported to the barangay.',
  circumstances_before_incident: 'Market was crowded at midday.',
  circumstances_after_incident: 'Barangay officials were informed immediately.',
  // 6. Property / damage
  property_involved: 'Cellular phone',
  property_description: 'Black smartphone, 128GB, serial TEST-12345',
  quantity: '1 unit',
  estimated_value: 'PHP 15,000.00',
  type_of_damage: 'Stolen',
  estimated_damage_cost: 'PHP 15,000.00',
  // 7. Witness
  witness_name: 'Pedro Santos',
  witness_age: '41',
  witness_address: '8 Bonifacio St., San Isidro, Quezon City',
  witness_contact_number: '0920 555 1234',
  witness_statement: 'Saw the suspect take the phone and run toward the terminal.',
  // 8. Evidence
  evidence_available: 'Yes',
  evidence_type: 'CCTV footage, physical',
  evidence_description: 'CCTV recording from the market entrance and the recovered phone box.',
  evidence_location: 'Held at the station evidence room',
  cctv_available: 'Yes',
  cctv_description: 'Market entrance camera facing the stall, footage covers 14:25–14:35.',
  attached_documents: 'Market CCTV log, phone purchase receipt',
  // 9. Police action
  responding_officers: 'Pat. Reyes, Pat. Santos',
  initial_response: 'Scene secured and parties interviewed.',
  actions_taken: '1) Interviewed witnesses. 2) Requested CCTV footage.',
  evidence_collected: 'CCTV copy, phone purchase receipt.',
  persons_interviewed: 'Juan Dela Cruz, Pedro Santos',
  medical_assistance: 'None required',
  arrest_made: 'No',
  referral_or_endorsement: 'Endorsed to the investigation unit',
  current_case_status: 'Under Investigation',
  // 10. Reporting officer
  report_date: '2026-09-09',
  report_time: '16:45',
};

async function cleanup() {
  for (const reportId of ids.reports) {
    await pool.execute('DELETE FROM report_people WHERE report_id=?', [reportId]);
    await pool.execute('DELETE FROM reports WHERE id=?', [reportId]);
  }
  if (ids.officer) await pool.execute('DELETE FROM officers WHERE id=?', [ids.officer]);
  if (ids.user) await pool.execute('DELETE FROM login_verification_challenges WHERE user_id=?', [ids.user]);
  if (ids.user) await pool.execute('DELETE FROM activity_logs WHERE actor_user_id=?', [ids.user]);
  if (ids.user) await pool.execute('DELETE FROM users WHERE id=?', [ids.user]);
}

(async () => {
  let server;
  try {
    const [user] = await pool.execute(
      'INSERT INTO users(username,password_hash,role,is_active) VALUES (?,?,?,TRUE)',
      [username, await hashPassword(password), 'officer']
    );
    ids.user = user.insertId;
    const [officer] = await pool.execute(
      'INSERT INTO officers(user_id,badge_number,first_name,last_name,`rank`,unit,email) VALUES (?,?,?,?,?,?,?)',
      [ids.user, `DETAIL-${stamp}`, 'Detail', 'Tester', 'Patrol Officer', 'Test Unit', `detail.${stamp}@example.test`]
    );
    ids.officer = officer.insertId;

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const api = client(baseUrl);

    // Login with two-step email verification (json mail transport)
    const login = await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.verificationRequired, true);
    const code = (mailService.getLastTestMessage()?.text || '').match(/\b(\d{6})\b/)?.[1];
    assert.ok(code, 'Expected a six-digit verification code in the test mail transport.');
    const verified = await api.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ code }) });
    assert.equal(verified.status, 200);
    if (verified.body.data.mustChangePassword) {
      const changed = await api.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: password, newPassword: password, confirmPassword: password }) });
      assert.equal(changed.status, 200);
    }

    // --- 1. Create with the full 10-section payload --------------------
    const created = await api.request('/reports', { method: 'POST', body: JSON.stringify(detailPayload) });
    assert.equal(created.status, 201);
    const reportId = created.body.data.id;
    ids.reports.push(reportId);
    assert.match(created.body.data.report_number, /^BW-\d{4}-\d{6}$/);

    // --- 2. Round-trip: GET returns every section value ----------------
    const fetched = await api.request(`/reports/${reportId}`);
    assert.equal(fetched.status, 200);
    const report = fetched.body.data;
    const expected = { ...detailPayload };
    // getReport formats DATE/TIME columns as ISO strings — same values round-trip.
    for (const [field, value] of Object.entries(expected)) {
      assert.equal(String(report[field] ?? ''), value, `Field ${field} did not round-trip`);
    }

    // --- 3. Blank strings normalize to NULL ----------------------------
    const blanks = await api.request('/reports', { method: 'POST', body: JSON.stringify({
      title: 'Blank normalization test',
      incident_type: 'other',
      incident_date: '2026-09-09',
      incident_time: '10:00',
      location: 'Test location',
      narrative: 'A factual narrative used only to verify blank-string normalization behavior in detail fields.',
      barangay: '   ',
      suspect_alias: '',
      estimated_value: '   ',
      report_date: '2026-09-09',
    }) });
    assert.equal(blanks.status, 201);
    ids.reports.push(blanks.body.data.id);
    const blankReport = blanks.body.data;
    for (const field of ['barangay', 'suspect_alias', 'estimated_value']) {
      assert.equal(blankReport[field], null, `Blank ${field} should be stored as NULL`);
    }
    assert.equal(blankReport.report_date, '2026-09-09');

    // --- 4. Update: undefined fields keep old values -------------------
    const update = await api.request(`/reports/${blanks.body.data.id}`, { method: 'PUT', body: JSON.stringify({
      barangay: 'Bagong Pag-asa',
      suspect_alias: 'Totoy',
    }) });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.barangay, 'Bagong Pag-asa');
    assert.equal(update.body.data.suspect_alias, 'Totoy');
    assert.equal(update.body.data.report_date, '2026-09-09', 'Undefined detail fields must keep their old value on update');
    assert.equal(update.body.data.location, 'Test location');

    // --- 5. Type-specific JSON data (dynamic incident-type fields) -----
    // Removed-as-redundant keys (quantity, cctv_available) migrate into their
    // shared top-level columns; registry keys persist as JSON; rogue keys drop.
    const typed = await api.request('/reports', { method: 'POST', body: JSON.stringify({
      title: 'Type-specific data test',
      incident_type: 'theft',
      incident_date: '2026-09-09',
      incident_time: '09:00',
      location: 'Test store',
      narrative: 'A factual narrative used only to verify type-specific field persistence for a theft report.',
      type_specific_data: { item_stolen: 'Cellular phone', quantity: '1', cctv_available: 'Yes', rogue_key: 'should be dropped' },
    }) });
    assert.equal(typed.status, 201);
    ids.reports.push(typed.body.data.id);
    const typedReport = typed.body.data;
    assert.equal(typeof typedReport.type_specific_data, 'object');
    assert.equal(typedReport.type_specific_data.item_stolen, 'Cellular phone');
    assert.equal(typedReport.type_specific_data.quantity, undefined, 'Redundant key must move into the top-level column');
    assert.equal(typedReport.quantity, '1', 'Redundant key value must land in the shared column');
    assert.equal(typedReport.cctv_available, 'Yes', 'Redundant key value must land in the shared column');
    // Keys outside the registry for the selected type are dropped.
    assert.equal(typedReport.type_specific_data.rogue_key, undefined);
    // Update: switching incident type keeps only fields valid for the new type.
    const retype = await api.request(`/reports/${typed.body.data.id}`, { method: 'PUT', body: JSON.stringify({
      incident_type: 'traffic',
      type_specific_data: { accident_type: 'Rear-end collision', item_stolen: 'stale theft field' },
    }) });
    assert.equal(retype.status, 200);
    assert.equal(retype.body.data.type_specific_data.accident_type, 'Rear-end collision');
    assert.equal(retype.body.data.type_specific_data.item_stolen, undefined, 'Theft-only field must not survive reclassification to traffic');

    // --- 6. AI authorship boundary (revised) ---------------------------
    // The generate action drafts the full PNP report: §I–VI sections plus the
    // §III narrative. Structured detail fields (10-section spec) and the
    // type-specific JSON fields remain officer-authored, never AI-drafted.
    const aiDraftableFields = Object.keys(REPORT_DRAFT_SCHEMA.properties);
    for (const field of ['authority', 'matters_investigated', 'discussion', 'conclusion', 'recommendation']) {
      assert.equal(aiDraftableFields.includes(field), true, `${field} must be AI-draftable (full-report generate)`);
    }
    for (const field of ['complainant_full_name', 'suspect_status', 'evidence_available', 'current_case_status', 'item_stolen', 'accident_type', 'station_name', 'approving_authority_name']) {
      assert.equal(
        aiDraftableFields.includes(field), false,
        `${field} must never be part of the AI draft schema`
      );
    }

    // --- 7. Redundancy guard: no type-specific field duplicates a common fact
    // (same JSON key as a detail column, or a key already mapped as common).
    const detailColumnSet = new Set(['incident_type', 'incident_date', 'incident_time', 'location', 'summary', 'narrative']);
    for (const [slug, set] of Object.entries(TYPE_FIELDS)) {
      for (const def of set) {
        assert.equal(
          REMOVED_TO_COMMON[def.name] === undefined && COMMON_FIELD_MAPPING[def.name] === undefined,
          true,
          `${slug}/${def.name} duplicates a common column fact and must not reappear in the type registry`
        );
      }
    }

    console.log('Report detail field tests passed: 10-section create persistence, GET round-trip, blank-to-NULL normalization, partial update semantics, type-specific JSON validation, and the AI authorship boundary.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cleanup().catch((error) => console.error('Test cleanup failed:', error.code || error.message));
    await pool.end();
  }
})().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
