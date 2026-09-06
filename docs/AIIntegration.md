# BLUEWRITE — Google AI Studio Integration

## Overview

BLUEWRITE uses the official Google Gen AI Node.js SDK and the Gemini Developer API to create an editable report draft from an Officer-supplied narrative and to improve or review report wording. Google AI Studio is an assistant only: it cannot save, approve, certify, submit, or finalize a report. The authenticated Officer reviews and verifies every result.

The React frontend never communicates with Google AI Studio directly. It calls the authenticated Express endpoint, which verifies report ownership and Draft status before invoking the backend AI pipeline.

```text
Officer UI
  → POST /api/ai/report-assist
  → Officer authentication and report ownership check
  → Deterministic fact extraction and validation service
  → Official Google Gen AI Node.js SDK
  → Gemini Developer API (`generateContent`)
  → Deterministic output validation and at most one correction
  → Officer review
```

No database migration is required. Generate Report returns the existing editable `title`, `incident_type`, `incident_date`, `incident_time`, `location`, `summary`, `narrative`, `complainant`, `victim`, `suspect`, and `witness` form fields. The fields are applied only after explicit Officer acceptance and are never saved or submitted automatically.

## Google AI Studio Setup

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Open `backend/.env`.
3. Configure:

   ```env
   GEMINI_API_KEY=YOUR_KEY_HERE
   GEMINI_MODEL=gemini-3.6-flash
   GEMINI_TIMEOUT_MS=90000
   GEMINI_MAX_OUTPUT_TOKENS=1200
   GEMINI_RETRY_DELAY_MS=750
   ```

4. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

5. Start the backend:

   ```bash
   npm run dev
   ```

6. Start the frontend using the existing BLUEWRITE procedure.

The API key must never be committed to Git, placed in frontend code, added to a `VITE_` environment variable, stored in MySQL, printed in logs, or returned in an error response. `backend/.env` is excluded by `backend/.gitignore`.

The model is configuration-driven. `gemini-3.6-flash` is the default because Google reports that `gemini-2.5-flash` is unavailable to new users. The configured Google AI Studio project must have access to the selected Gemini model identifier. If the API rejects it, set `GEMINI_MODEL` to an available Gemini Developer API model without changing application code.

## Configuration and health

The backend can start without `GEMINI_API_KEY` so authentication, database, dashboards, and manual report workflows remain available. Startup prints a key-free configuration warning, `/api/health` reports `aiProvider: Google AI Studio` and `ai: configured` or `not_configured`, and an AI request returns:

> Google AI Studio integration is not configured. Set GEMINI_API_KEY in the backend environment.

The health route never calls Google AI Studio and therefore creates no API usage.

## Privacy and data minimization

Every Gemini `generateContent` call uses this shape:

```js
{
  model: configuredModel,
  contents: minimalStructuredIncidentFacts,
  config: {
    systemInstruction: centralizedPrompt,
    temperature: 0.1,
    maxOutputTokens: configuredLimit,
    responseMimeType: 'text/plain',
    abortSignal: boundedRequestSignal
  }
}
```

Only facts needed to draft the current authorized report are sent. BLUEWRITE does not send passwords, hashes, session cookies, authentication tokens, API keys, database credentials, unrelated Officer data, or unrelated reports.

The activity log records technical metadata only: authenticated actor, report target, AI action, provider (`Google AI Studio`), configured model, success/failure, validation status, retry count, and factual categories. It does not store the Google AI Studio key, full prompt, complete incident payload, or complete generated narrative.

Using Google AI Studio requires internet access and sends the necessary current-report information to Google AI Studio for processing under the account's applicable Google AI Studio terms and data controls. There is no automatic local-model fallback.

## Fact-preserving pipeline

```text
RAW OFFICER NOTES
  → DETERMINISTIC STRUCTURED FACT EXTRACTION
  → NORMALIZATION AND SEMANTIC DEDUPLICATION
  → ENTITY RESOLUTION AND CONFLICT DETECTION
  → ROLE / DESCRIPTION / ACTION-STATUS LOCKING
  → CHRONOLOGICAL EVENT ORDERING
  → GEMINI GENERATION FROM CLEAN STRUCTURED FACTS ONLY
  → DETERMINISTIC VALIDATION
  → AT MOST ONE CORRECTIVE GEMINI RESPONSE
  → SAFE SENTENCE FILTERING WHEN POSSIBLE
  → OFFICER REVIEW OR BLOCKED DRAFT
```

The immutable raw-note snapshot remains the source of truth during regeneration. Previous model drafts are never treated as evidence.

### Clean fact object

The generation input contains only canonical incident fields, locked people, a deduplicated event list, and uncertainty markers. It does not include repeated category projections or unrelated report fields.

```json
{
  "incident": {
    "type": "Theft",
    "date": "2026-09-04",
    "time": "18:50",
    "location": "Public Market"
  },
  "persons": [
    {
      "name": "Juan Dela Cruz",
      "locked_role": "complainant",
      "age": 34
    }
  ],
  "events": [
    {
      "time": 1130,
      "attribution": "officer_notes",
      "action_status": "stated_fact",
      "fact": "Officer-provided fact"
    }
  ],
  "uncertainties": ["approximately", "not sure"]
}
```

Missing fields are omitted or left empty; they are never invented.

### Deduplication

BLUEWRITE strips `Narrative N:` labels, removes exact normalized duplicates, and conservatively identifies paraphrases through content-token overlap. Negation, uncertainty, times, and monetary values are part of a critical signature, so `CCTV was reviewed` is never merged with `CCTV could not be reviewed`. Duplicate provenance and counts remain internal for auditability.

### Entity and role locking

Persisted `report_people` values and explicit Officer role fields are canonical. Names are normalized case-insensitively. Generic descriptions such as `an unidentified male ...` resolve to one internal entity, and supplied clothing/age tokens are locked to that entity.

If canonical sources assign incompatible roles to the same person, BLUEWRITE records `AI_SOURCE_ROLE_CONFLICT`, withholds the disputed role from generation, and blocks acceptance rather than guessing. A narrative-only discrepancy retains the canonical role and appears as a separate verification warning. Canonical Location similarly takes precedence over malformed fragments; BLUEWRITE never completes an address.

## Centralized prompts and output

Generation and review prompts are centralized in `backend/src/prompts/policeReportPrompt.js`. They prohibit invented facts, guilt conclusions, fabricated evidence/testimony/findings, role changes, lost uncertainty, and pending actions presented as complete.

Generate Report uses Gemini structured JSON output to return the real editable report fields; its `narrative` property is one continuous professional paragraph. Improve returns only a revised narrative paragraph. Headings, bullets, numbered lists, Markdown, explanations, and narrative labels are prohibited inside narrative prose. The Check action uses a separate review-only prompt.

AI-derived incident type, date, time, location, and person-role fields must be explicitly supported by the source narrative. Unsupported proposals are replaced with blank values and listed in `reportFieldIssues`; existing Officer-entered fields always take precedence. Title and summary may be concisely derived but are screened for unsupported protected values and high-risk factual claims.

## Validation and bounded correction

Before display, deterministic checks cover:

- supplied and newly introduced protected values;
- names and locked roles;
- clothing/description changes;
- uncertainty and important negative facts;
- event-time attachment and chronology;
- pending versus completed action status;
- unsupported suspect/guilt language;
- repeated output facts; and
- one-paragraph output format.

Validation returns `valid`, `issues`, `unsupported_details`, `role_conflicts`, and `confidence`. If the first response fails, BLUEWRITE makes at most one corrective Gemini `generateContent` call using the same clean fact object and issue categories. It never loops and never passes the failed draft back as evidence. BLUEWRITE does not silently delete a sentence merely because one phrase was flagged; this prevents supported Officer facts in the same sentence from disappearing. An unresolved generated draft remains visible beside the original notes for transparency, but is marked as requiring correction and cannot be inserted automatically.

## Error handling

The Google AI Studio service maps missing configuration, authentication failures, quota/rate limits, overload, invalid model/request errors, network failures, timeouts, server failures, and empty outputs to controlled application errors. Raw SDK details and keys are not returned to the frontend.

The Officer UI receives a safe, condition-specific message for authentication, quota/rate-limit, high-demand overload, invalid model/request, timeout, connectivity, and empty-output failures. This avoids presenting every provider failure as a generic outage while still withholding raw Google responses and credentials.

`GEMINI_TIMEOUT_MS` is one total deadline for a generation request, not a per-attempt timeout. BLUEWRITE disables the SDK's implicit retries and performs at most one explicit retry after a fast HTTP 503 overload response, waiting `GEMINI_RETRY_DELAY_MS` first. Timed-out, authentication, quota, and invalid-request failures are not retried. The primary generation budget defaults to 90 seconds; a factual-correction pass, when required, is separately capped at 45 seconds. The frontend allows 150 seconds so the backend can return its own controlled result first.

The frontend preserves all entered report information, prevents duplicate button clicks while a request is active, shows a loading state, and permits retry after completion or failure.

## Audit categories

Factual and pipeline categories include:

- `AI_ROLE_MISMATCH`
- `AI_ENTITY_MISMATCH`
- `AI_DESCRIPTION_MISMATCH`
- `AI_ACTION_STATUS_MISMATCH`
- `AI_CHRONOLOGY_MISMATCH`
- `AI_DUPLICATE_FACT`
- `AI_OUTPUT_FORMAT_MISMATCH`
- `AI_SOURCE_ROLE_CONFLICT`
- `AI_SOURCE_LOCATION_CONFLICT`
- `AI_UNSUPPORTED_DETAIL`
- `AI_FACT_VALIDATION_FAILED`

## Limitations

- Google AI Studio access requires working internet, valid API credentials, available quota, and access to the configured model.
- BLUEWRITE does not create chats, send prior provider responses as history, or persist prompts/responses in its own AI integration. The Gemini `generateContent` API has no OpenAI-style `store: false` field; deployment teams must review Google's current Gemini API privacy, retention, abuse-monitoring, regional, and organizational policies before processing operational police data.
- Deterministic validation is conservative and cannot prove semantic truth. Officer verification against original notes remains mandatory.
- A response may be blocked even when professionally written if required uncertainty, attribution, names, or event relationships were changed or omitted.