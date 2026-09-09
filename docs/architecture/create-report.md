# Create Report Page — Architecture

Route: `/officer/reports/new` — file: `frontend/src/pages/officer/CreateReportPage.jsx` (~2,200 lines).
Purpose: officer creates an incident report through a **summary-first** UI (summary panel is the main content; a guided AI chat is a floating popover), then generates the PNP investigation report with AI, verifies it in a template-formatted preview, and submits to a printable read-only view.

This doc gives another AI (or a new developer) just enough to work on this page safely.

---

## 1. Component layout

```
CreateReportPage
├── Draft restore banner          (localStorage 'bluewrite:create-draft' found → Restore / Discard)
├── SummaryPanelContent           ← MAIN content, all viewports
│   ├── Progress bar              (Report completion %, REQUIRED_FIELDS + 30-char narrative)
│   ├── SUMMARY_SECTIONS          (section cards, each = grid of FieldCard click-to-edit cards)
│   │   ├── 'Type-Specific Details'  → TypeSpecificSection (dynamic, from incident type)
│   │   ├── 'PNP Memorandum Header'  → station block inputs
│   │   └── 'Investigation Report Sections' → PNP-TEMPLATE-FORMATTED card:
│   │       ├── AIReportChat (gated — see §7) or a disabled gate note
│   │       ├── Header block (Republic of the Philippines / NAPOLCOM / PNP / station)
│   │       ├── Memorandum block (FOR / SUBJECT / DATE)
│   │       ├── §I–VI body, editable in place (§III = narrative)
│   │       └── Signatory block (Investigated by / Approved for filing)
│   └── action bar                (Save as Draft · Cancel · Submit Report)
├── Floating assistant popover    (FAB bottom-right, step badge "n/7", click-away close)
│   └── guided Q&A chat           (INITIAL_QUESTIONS, mini-forms, writing presets)
└── ConfirmDialog (submit gate) + Toast
```

Shared components: `AIReportChat` (`components/ai/AIReportChat.jsx`, also used by Edit page), `TimePicker` (`components/common/TimePicker.jsx`), `Input/Select/Textarea/Button/Toast/ConfirmDialog`.

### TimePicker (redesigned)

`components/common/TimePicker.jsx` — used for `incident_time` (and the guided chat's time mini-form). HH:MM numeric inputs in one bordered container with a static colon, stacked steppers on the right edge (click = 1 minute; **Shift+click or Shift+Arrow = 5 minutes**), an AM/PM segmented toggle, and three quick chips: **Set to now / Round to :00 / Round to :30** (rounding keeps the hour). Commits 24-hour `HH:MM` — same storage format as before; UI-layer only. Any new time field should reuse this component, not `<input type="time">`.

---

## 2. State (single source of truth: `formData`)

| State | Role |
|---|---|
| `formData` | **All report data.** Flat object; keys = column names. `type_specific_data` is a nested JSON object. |
| `errors`, `formMessage` | Validation display |
| `reportId` | Persisted backend report id (null until first save). `ensureReportId()` creates the report on demand (used by AI actions and save). |
| `messages`, `currentQuestionIndex`, `hasGreeted`, `assistantOpen` | Guided chat conversation + popover state |
| `getPendingAIDraft` (ref) + `pendingAIDraft` | Registered apply-getter from `AIReportChat` — a validated open AI preview auto-included on Save/Submit |
| `submitting`, `aiCooldownUntil` | Submit in flight; 60s AI quota cooldown |
| `saveState`, `localDraftFound` | Debounced autosave status; restore banner |
| `completeness` (memo) | **The one completeness check**: `{ ready, missingLabels, narrativeShort }`. Derived from `REQUIRED_FIELDS` + 30-char narrative over `{...formData, ...pendingAIDraft}`. Reused by the Submit button AND the Generate Report gate — never write a parallel check. |

Derived helpers (module scope, below the constants): `INITIAL_QUESTIONS` (guided flow), `FIELD_LABELS`, `FIELD_PLACEHOLDERS`, `FIELD_SELECT_OPTIONS`, `FULL_WIDTH_FIELDS`, `TEXTAREA_FIELDS`, `DATE_FIELDS/TIME_FIELDS/NUMBER_FIELDS`, `REQUIRED_FIELDS`, `PEOPLE_FIELDS`, `FACTS_FIELD = 'narrative'`, `OFFICER_AUTHORED_SECTIONS`, `INCIDENT_TYPE_KEYWORDS(_EXACT)` (fast-path parsing), `WRITING_PRESETS`.

---

## 3. Section registry — `SUMMARY_SECTIONS` (chronological, numbered)

The page renders itself from this registry; add/remove fields here, not in JSX. Order is deliberate (matches the 10-section PNP spec):

1. **Incident Information** — `incident_type, incident_date/time, date_reported/time_reported, location, specific_place, barangay, city, province`
2. **Type-Specific Details** — dynamic (see §6)
3. **Complainant Information** — `complainant_full_name, age, sex, address, contact_number, role`
4. **Victim Information** — `victim_full_name, age, sex, address, contact, injuries, damage_or_loss`
5. **Suspect Information** — `suspect_name, alias, age, sex, address, physical_description, status`
6. **Incident Account** — `summary, what_happened, sequence_of_events, people_involved, actions_of_suspect/victim, circumstances_before/after_incident`
7. **Property / Damage**, 8. **Witness Information**, 9. **Evidence**, 10. **Police Action**, then **Reporting Officer**, **PNP Memorandum Header**, **Investigation Report Sections**

Sections may carry a `formal` label (`Section N · Name`) shown as the card heading. The old name-only "People Involved" section (`complainant/victim/suspect/witness` role fields) was **removed as a duplicate** — those role names are now *derived* (§5).

---

## 4. Data persistence

**Local draft** (debounced 500ms, effect keyed on `[formData, messages, currentQuestionIndex, hasGreeted]`):

```json
// localStorage key: 'bluewrite:create-draft'
{ "fields": { ...formData }, "assistant": { "messages": [...], "currentQuestionIndex": 0, "hasGreeted": true } }
```

Restore handles two shapes: this envelope, or a legacy flat formData object.

**Backend** — `createReport(payload)` → `POST /api/reports` → `reportService.createReport`:
- flat detail columns (63 `detailFields`), PNP memo columns (`pnpFields`), `type_specific_data` JSON column
- role name fields (`complainant`, `victim`, `suspect`, `witness`) become rows in `report_people`
- status starts `'Draft'`; `submitReport(id)` sets `'Submitted'` (read-only afterwards)

**After Save as Draft**: navigate to `/officer/reports/:id/edit`.
**After Submit**: create + submit, then navigate to `/officer/reports/:id` (view page = PNP template render + Print).

---

## 5. Redundancy guard — `withDerivedRoles(base)`

The guided chat historically captured role names (`complainant`, `victim`, `suspect`, `witness`). The full party sections (§3–5 above) capture the same people with more detail. To never ask twice:

- `withDerivedRoles` copies `complainant_full_name → complainant`, `victim_full_name → victim`, `suspect_name → suspect`, `witness_name → witness` (only when the role field is empty).
- Applied at: `saveDraft` payload, submit payload, `extractReportFields({ knownFields })`, and `AIReportChat reportContext` (so the AI sees one canonical name per person).
- The chat can still fill a role name first; the full sections remain the detail source. No field is rendered twice.

---

## 6. Dynamic type-specific fields

- Registry: `frontend/src/utils/incidentTypeFields.js` (mirror of `backend/src/services/incidentTypeFields.js` — keep in sync).
- `fieldsForIncidentType(incidentType)` returns field defs (`name, label, type: text|textarea|number|select, options`) for the selected type(s); multi-select unions sets.
- Values live in `formData.type_specific_data` (JSON). Common spec fields map to existing columns (e.g. `complainant_name → complainant_full_name`, `police_action_taken → actions_taken`) — never duplicated into the JSON.
- Backend `sanitizeTypeSpecificData` drops keys not in the registry for the selected type.
- **Redundancy guard (tested):** a type-specific entry must never duplicate a top-level column fact. Fields that did (`victim_name`, `suspect_name`, `property_description`, `quantity`, `estimated_value`, `type_of_damage`, `estimated_damage_cost`, `cctv_available`, `cctv_description`, `suspect_status`, `suspect_age`, `incident_location` in rape, `victim_injury` in robbery) were **removed** from all 14 type sets. `REMOVED_TO_COMMON` maps each removed key to its column, and `expandRemovedTypeSpecificKeys(data)` (called at the top of `createReport`/`updateReport`) migrates any old JSON values into the shared columns on write — officer-entered column values always win. Asserted in `backend/test/reportDetailFields.test.js` (section 7) so it cannot silently regress.

---

## 7. AI integration (call-timing contract — do not regress)

**Zero AI calls on mount, on popover open/close, or on any render.** Every AI request traces to an explicit officer action:

| Trigger | Call | Notes |
|---|---|---|
| Chat message (guided Q&A) | `extractReportFields` | Fast-path exact answers (`fastPathExtract`) skip AI entirely; local parse fallback when AI is down |
| Writing preset / free writing instruction | `requestReportAssistance({action:'improve'})` | Validated by `validateWritingRequest`; refused out-of-scope requests never reach the API |
| **Generate Report button** (in `AIReportChat`, inline in Investigation Report Sections) | `requestReportAssistance({action:'generate'})` | **Gated on `completeness.ready`** — the panel only renders once all required fields + the 30-char narrative are filled; while incomplete a static note lists what's missing. Drafts §I–VI + narrative + title/summary from `reportContext` |

The Generate gate reuses the exact `completeness` memo the Submit button uses — one source of truth. Gating is render-conditional, never an effect: incomplete state shows a note, complete state mounts the panel. No auto-trigger exists in either branch.

`AIReportChat` contract (shared with Edit page):
- Props: `reportId`, `reportStatus`, `reportContext`, `onInsertSuggestion(draft)`, `onRegisterApply(getter)`, `onEnsureReportId` (Create page passes `ensureReportId` so AI can persist the draft on demand — Edit page omits it).
- Shows preview: fact confidence, validation issues, locked source facts, proposed fields, original-vs-generated comparison. Blocked drafts (`reviewReady === false`) can't be applied; flagged drafts need the acknowledgment checkbox.
- `Use Report Draft` → `onInsertSuggestion(reportDraft)` → merged into `formData` (all sections editable).
- While a preview is open, `onRegisterApply` exposes the validated draft; Save/Submit merges it via `getPendingAIDraft.current?.()`.
- Quota/rate-limit → `handleQuotaLimited()` sets 60s cooldown.

**AI-authorship boundary**: AI may draft §I–VI + narrative + title/summary ONLY (per explicit product decision, 2026-09). Station header, signatory/approving authority, all structured detail fields, and type-specific JSON are never AI-draftable — enforced server-side (`REPORT_DRAFT_SCHEMA` + `sanitizeGeneratedReportFields` in `aiService.js`) and asserted in `backend/test/reportDetailFields.test.js`.

---

## 8. Submission gates

`completeness` (memo) is the single completeness check: `REQUIRED_FIELDS` + 30-char narrative over the merged view `{...formData, ...pendingAIDraft}`. `isSubmitReady = completeness.ready` gates the Submit button. Submit asks `ConfirmDialog` first; status flips to Submitted and the record becomes read-only. After submit the officer lands on `/officer/reports/:id`, which renders the same PNP template layout read-only with Print.

## 9. Invariants for anyone editing this file

1. `formData` is the only report-data store; localStorage is a cache, the backend is the record.
2. Never fire AI requests from effects/mounts — only from explicit user actions. The Generate gate is a render condition, not a trigger.
3. Add fields via `SUMMARY_SECTIONS` + `FIELD_LABELS`/`FIELD_PLACEHOLDERS` (+ `FULL_WIDTH_FIELDS`/`TEXTAREA_FIELDS`/date/time/number sets as needed), not ad-hoc JSX.
4. §III narrative stays bound to the `narrative` key (`FACTS_FIELD`).
5. Keep `withDerivedRoles` applied at every exit point (save, submit, AI context).
6. Registry changes must be mirrored between `frontend/src/utils/incidentTypeFields.js` and `backend/src/services/incidentTypeFields.js`.
7. A type-specific registry entry must never duplicate a top-level column fact — if you add a field that overlaps an existing column, extend `COMMON_FIELD_MAPPING` (spec name → column) or `REMOVED_TO_COMMON` instead.
8. `completeness` is the only completeness check — Submit and the Generate gate must both derive from it.
9. Time inputs use the shared `TimePicker` component; the value format is always 24-hour `HH:MM`.
