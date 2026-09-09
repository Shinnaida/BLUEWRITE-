# BLUEWRITE — PNP Investigation Report Feature Architecture

Scope: the PNP memorandum-style Investigation Report capability added on top of
the existing incident-report flow. This document is intentionally minimal so an
AI agent (or new developer) can understand the feature without reading the whole
codebase. For the overall system, see [../Architecture.md](../Architecture.md).

---

## 1. What this feature does

Renders and prints incident reports in the standard PNP memorandum-style
Investigation Report format:

- Header block (Republic of the Philippines / NAPOLCOM / PNP / station info)
- Memorandum block (FOR / SUBJECT / DATE)
- Numbered body sections:
  - **I. Authority** — blotter entries, inherent police functions, SOP
  - **II. Matters to be Investigated** — numbered objectives
  - **III. Facts of the Case** — the incident narrative (AI-assisted)
  - **IV. Discussion / Evaluation** — optional
  - **V. Conclusion**
  - **VI. Recommendation**
- Signatory block (Investigated by / Approved for filing — Chief of Police or OIC)

**Hard AI boundary:** sections I, II, IV, V, VI plus all header/signatory fields
are **Officer-authored only**. The AI drafts nothing except the incident
narrative and the core report fields (title, incident_type, date, time,
location, summary, person roles). This is enforced structurally (the fields are
absent from the AI's JSON schema) and by prompt rule.

---

## 2. Data model

Thirteen nullable columns were added to the existing `reports` table.

| Column group | Columns | Purpose |
|---|---|---|
| Body sections | `authority`, `matters_investigated`, `discussion`, `conclusion`, `recommendation` | PNP §I, §II, §IV, §V, §VI (§III is the existing `narrative` column) |
| Station header | `station_name`, `station_region`, `station_address`, `station_email`, `station_contact` | Printed header block; blank = generic BLUEWRITE header |
| Signatory | `approving_authority_name`, `approving_authority_rank` | Approving officer (Chief of Police / OIC); the investigator is always the owning officer |
| Memorandum | `recipient_office` | The FOR line of the memo block |

- Migration: `backend/database/migrations/20260906_pnp_investigation_report_fields.sql`
- Fresh installs: the same columns exist in `backend/database/schema.sql`
- All columns are optional; nothing blocks submission

---

## 3. Backend flow

```
POST/PUT /api/reports  (reportRoutes → reportController → reportService)
    └─ reportService.js
         ├─ pnpFields  — the 13 field names (single source of truth)
         ├─ pnpValues  — trims strings, converts "" → null
         ├─ createReport — inserts the 13 fields alongside the originals
         └─ updateReport — per-field: undefined → keep old value, else trim/null
```

- `getReport` returns `SELECT r.*`, so the new fields flow to the frontend with
  no extra code.
- AI draft schema (`REPORT_DRAFT_FIELDS` in `aiService.js`) deliberately does
  NOT include any PNP field — the AI structurally cannot emit them.
- Prompt guardrail: `policeReportPrompt.js` (GENERATE REPORT OUTPUT OVERRIDE)
  states that authority/matters/discussion/conclusion/recommendation are
  Officer-authored and must never be drafted by the AI.

---

## 4. Frontend flow

Three surfaces, all persisting through the same `reportService` API calls:

| Surface | File | UI pattern |
|---|---|---|
| Create page (`/officer/reports/new`) | `frontend/src/pages/officer/CreateReportPage.jsx` | Summary panel renders two formal document-style forms (labeled inputs inside bordered cards): "PNP Memorandum Header" and "Investigation Report Sections" (includes §III = narrative textarea and the signatory block). Rendered by `SummaryPanelContent` when `section.title` matches; driven by `SUMMARY_SECTIONS` / `FIELD_LABELS` / `FIELD_PLACEHOLDERS` / `TEXTAREA_FIELDS`. |
| Edit page (`/officer/reports/:id/edit`) | `frontend/src/components/reports/ReportForm.jsx` | Traditional labeled form: "PNP Memorandum Header" section and "Investigation Report Sections" section (§I–§VI textareas + approving authority inputs). |
| Print / view | `frontend/src/components/reports/PrintableReport.jsx` | PNP memorandum layout: header block, MEMORANDUM (FOR/SUBJECT/DATE), §I–§VI (§III = narrative), case identifiers, two-column signatory block, AI-draft disclosure footer. Empty sections are omitted from the printout. |

Key Create-page details:
- The five body sections are multi-line textareas (`TEXTAREA_FIELDS`) and
  full-width (`FULL_WIDTH_FIELDS`); Enter inserts newlines instead of
  committing.
- §III FACTS OF THE CASE edits the same `narrative` field the AI chat and
  writing presets operate on — one field, two views.
- The investigator name in the signatory block is read-only (it is the
  authenticated officer, attached server-side).
- PNP fields never appear in validation, submit-readiness, or the progress bar.

---

## 5. Request sequence (create with PNP fields)

```
Officer fills form → CreateReportPage formData (includes PNP fields)
  → POST /api/reports  { ...core fields, authority, matters_investigated, ... }
    → reportService.createReport → INSERT (originals + 13 PNP columns)
      → report_number assigned (BW-YYYY-NNNNNN)
  → Officer prints → GET /api/reports/:id (all columns returned)
    → PrintableReport renders the PNP memorandum
```

---

## 6. Invariants an AI agent must preserve when modifying this feature

1. **Never add PNP fields to the AI draft schema or prompts as writable
   targets.** The officer-authors-sections boundary is the core safety design.
2. **`pnpFields` in `reportService.js` is the field list** — update it, the
   migration, `schema.sql`, both form surfaces, and `PrintableReport`
   together if a field is added.
3. **All PNP columns must stay nullable/optional** — they must never block
   submission.
4. **§III is `narrative`** — do not create a second facts field.
5. Blank strings from the UI are stored as **NULL** (`pnpValues`); keep that
   normalization when touching create/update.
6. The printed output omits empty sections; keep that behavior.
