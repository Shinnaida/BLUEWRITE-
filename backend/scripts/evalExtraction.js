// BLUEWRITE — AI extraction evaluation harness
// Usage:
//   Direct mode (default, no server/auth needed — requires GEMINI_API_KEY in backend/.env):
//     node scripts/evalExtraction.js
//   HTTP mode (against a running server, needs an officer session):
//     EVAL_COOKIE="connect.sid=s%3A..." node scripts/evalExtraction.js --http
//
// Sends realistic officer messages through the extraction pipeline and grades
// results against expected fields. Also enforces non-invention: any field not
// listed in `expect` must come back empty.

// env.js loads dotenv itself; requiring it here makes .env available for the
// Google AI config before any service module reads it.
require('../src/config/env');

const CASES = [
  {
    name: 'robbery + relative time + role name',
    message: 'robbed at knifepoint near the mall parking lot around 9 last night, complainant was Juan Dela Cruz',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: 'theft',
      location: (v) => /mall parking/i.test(v),
      incident_date: '2026-09-05',
      incident_time: '21:00',
      complainant: 'Juan Dela Cruz',
    },
  },
  {
    name: 'Taglish theft',
    message: 'nanakawan po ng cellphone kagabi sa palengke',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: 'theft',
      location: (v) => /palengke/i.test(v),
      incident_date: '2026-09-05',
    },
  },
  {
    name: 'traffic accident with victim',
    message: 'traffic accident along EDSA near Quezon Ave this morning around 7:30, victim is Maria Santos',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: 'traffic',
      location: (v) => /EDSA/i.test(v),
      incident_date: '2026-09-06',
      incident_time: '07:30',
      victim: 'Maria Santos',
    },
  },
  {
    name: 'exact formats',
    message: 'Theft, happened 2026-09-01 at 14:30 at Main St parking garage',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: 'theft',
      incident_date: '2026-09-01',
      incident_time: '14:30',
      location: (v) => /main st/i.test(v),
    },
  },
  {
    name: 'multi-role sentence',
    message: 'Suspect: Pedro Reyes. Victim: Ana Lopez. Witness: Carlos Mendoza. Happened at the public market yesterday afternoon.',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: (v) => v === '' || v === 'theft', // no explicit crime vocabulary; either acceptable
      incident_date: '2026-09-05', // "yesterday afternoon" is explicitly stated
      suspect: 'Pedro Reyes',
      victim: 'Ana Lopez',
      witness: 'Carlos Mendoza',
      location: (v) => /public market/i.test(v),
    },
  },
  {
    name: 'no extractable facts → empty result, no invention',
    message: 'ok thanks',
    currentDate: '2026-09-06',
    expect: {}, // every field must come back empty
  },
  {
    name: 'must not copy known fields back',
    message: 'the suspect also had an accomplice',
    currentDate: '2026-09-06',
    knownFields: { suspect: 'Pedro Reyes', incident_type: 'theft' },
    ignore: ['summary'],
    expect: {
      suspect: '', // must NOT echo the known value — "the suspect" is a reference, not a new name
      // incident_type: not restated in this message, so it must NOT come back (enforced below)
    },
    expectAbsent: ['incident_type'],
  },
  {
    name: 'vandalism + time only',
    message: 'graffiti sprayed on the barangay hall wall at around 11pm',
    currentDate: '2026-09-06',
    ignore: ['summary'],
    expect: {
      incident_type: 'vandalism',
      location: (v) => /barangay hall/i.test(v),
      incident_time: '23:00',
    },
  },
];

function grade(name, extracted, expect) {
  const failures = [];
  const allKeys = new Set([...Object.keys(expect), ...Object.keys(extracted)]);
  for (const key of allKeys) {
    const actual = extracted[key] ?? '';
    const expected = expect[key];
    if (expected === undefined) {
      if (actual !== '') failures.push(`${key}: expected empty, got "${actual}"`);
    } else if (typeof expected === 'function') {
      if (actual !== '' && !expected(actual)) failures.push(`${key}: "${actual}" failed predicate`);
    } else if (actual !== expected) {
      failures.push(`${key}: expected "${expected}", got "${actual}"`);
    }
  }
  return failures;
}

async function runDirect(testCase) {
  const aiService = require('../src/services/aiService');
  const result = await aiService.extractReportFields({
    message: testCase.message,
    knownFields: testCase.knownFields || {},
    currentDate: testCase.currentDate,
  });
  return result.extracted;
}

async function runHttp(testCase, cookieHeader) {
  const res = await fetch(`${process.env.EVAL_BASE_URL || 'http://localhost:3000/api'}/ai/report-assist/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookieHeader },
    body: JSON.stringify({
      message: testCase.message,
      knownFields: testCase.knownFields || {},
      currentDate: testCase.currentDate,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.json())?.message || ''}`);
  const { data } = await res.json();
  return data?.extracted || {};
}

async function main() {
  const httpMode = process.argv.includes('--http');
  let cookieHeader = {};
  if (httpMode) {
    if (!process.env.EVAL_COOKIE) {
      console.error('HTTP mode requires EVAL_COOKIE="connect.sid=..." from a logged-in officer session.');
      process.exit(1);
    }
    cookieHeader = { Cookie: process.env.EVAL_COOKIE };
  } else {
    // Fail fast with a clear message if the key is missing.
    const googleAIService = require('../src/services/googleAIService');
    if (!googleAIService.configured()) {
      console.error('GEMINI_API_KEY is not set in backend/.env — cannot run direct eval.');
      process.exit(1);
    }
  }

  let pass = 0;
  let fail = 0;
  const delayMs = Number(process.env.EVAL_DELAY_MS || 15000);

  for (const testCase of CASES) {
    try {
      const extracted = httpMode ? await runHttp(testCase, cookieHeader) : await runDirect(testCase);
      // `summary` is optional by design: the model restating a faithful summary is
      // desirable, so it is only graded when a case explicitly expects it.
      const gradeable = { ...extracted };
      for (const key of testCase.ignore || []) delete gradeable[key];
      const failures = grade(testCase.name, gradeable, testCase.expect);
      for (const key of testCase.expectAbsent || []) {
        if (extracted[key]) failures.push(`${key}: expected absent (was not restated in message), got "${extracted[key]}"`);
      }
      if (failures.length === 0) {
        console.log(`✓ ${testCase.name}`);
        pass++;
      } else {
        console.log(`✗ ${testCase.name}`);
        console.log(`    message: "${testCase.message}"`);
        console.log(`    got:     ${JSON.stringify(extracted)}`);
        for (const f of failures) console.log(`    ${f}`);
        fail++;
      }
    } catch (error) {
      console.log(`✗ ${testCase.name} — ${error.message}`);
      fail++;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log(`\n${pass}/${pass + fail} cases passed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
