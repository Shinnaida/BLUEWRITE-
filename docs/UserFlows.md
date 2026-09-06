# BLUEWRITE — User Flows

---

## Overview

This document describes the key user flows for the BLUEWRITE application for both admins and police officers.

All flows assume the implementation is complete. The project is currently **under development**; these flows are the planned behavior.

**Key rules:**

- Reports have only two statuses: `draft` and `submitted`.
- There is **no approval workflow**.
- Officers can only access their own reports.
- Submitted reports cannot be edited.
- Officers are disabled rather than deleted.
- The AI is an assistant only.

---

## 1. Officer Login

```mermaid
flowchart TD
    START[Officer opens login page] --> ENTER[Enter username and password]
    ENTER --> VALIDATE[System validates credentials]
    VALIDATE -->|Invalid| ERROR[Show error message]
    ERROR --> ENTER
    VALIDATE -->|Valid| CHECK[Check account status]
    CHECK -->|Disabled| DENIED[Show: Account disabled]
    DENIED --> ENTER
    CHECK -->|Active| ROLE[Check role]
    ROLE -->|Officer| DASH[Redirect to officer dashboard]
```

**Notes:**

- Disabled officers cannot log in.
- Login is recorded in `activity_logs`.

---

## 2. Admin Login

```mermaid
flowchart TD
    START[Admin opens login page] --> ENTER[Enter username and password]
    ENTER --> VALIDATE[System validates credentials]
    VALIDATE -->|Invalid| ERROR[Show error message]
    ERROR --> ENTER
    VALIDATE -->|Valid| CHECK[Check account status]
    CHECK -->|Disabled| DENIED[Show: Account disabled]
    DENIED --> ENTER
    CHECK -->|Active| ROLE[Check role]
    ROLE -->|Admin| DASH[Redirect to admin dashboard]
```

---

## 3. Create Draft

```mermaid
flowchart TD
    START[Officer on dashboard] --> CLICK[Click: Create Report]
    CLICK --> FORM[Report form opens]
    FORM --> FILL[Fill in report details]
    FILL --> SAVE[Click: Save Draft]
    SAVE --> VALIDATE[Validate required fields]
    VALIDATE -->|Missing required| ERR[Show validation errors]
    ERR --> FILL
    VALIDATE -->|OK| CREATE[Report created with status draft]
    CREATE --> VIEW[Redirect to My Reports]
```

**Notes:**

- A new report is always created as a `draft`.
- A unique report number is generated.
- The report is owned by the creating officer.

---

## 4. Edit Draft

```mermaid
flowchart TD
    START[Officer on My Reports] --> SELECT[Select a draft report]
    SELECT --> EDIT[Open edit form]
    EDIT --> CHANGE[Make changes]
    CHANGE --> SAVE[Click: Save Draft]
    SAVE --> VALIDATE[Validate fields]
    VALIDATE -->|Missing required| ERR[Show validation errors]
    ERR --> CHANGE
    VALIDATE -->|OK| UPDATE[Report updated, stays draft]
    UPDATE --> VIEW[Return to My Reports]
```

**Constraints:**

- Only the owning officer can edit.
- Only `draft` reports can be edited.
- Submitted reports cannot be edited (edit option hidden; backend rejects).

---

## 5. Generate AI Report from Narrative

```mermaid
flowchart TD
    START[Officer on report form] --> ENTER[Enter report facts]
    ENTER --> CLICK[Click: Generate with AI Assistant]
    CLICK --> REQ[Frontend calls POST /api/ai/report-assist]
    REQ --> BACKEND[Backend AI Service]
    BACKEND --> GEMINI[Official SDK calls Gemini generateContent]
    GEMINI --> RESP[Google AI Studio returns structured report draft]
    RESP --> LOG[Technical metadata logged to activity_logs]
    LOG --> RETURN[Return report fields to frontend]
    RETURN --> FILL[Supported values fill editable report fields]
    FILL --> REVIEW[Officer reviews and edits every field]
    REVIEW --> SAVE[Officer saves or submits as needed]
```

**Key points:**

- The AI output is **editable** by the officer.
- The AI never saves or submits automatically.
- The frontend never talks to Google AI Studio directly and never receives the API key.

---

## 6. Analyze Report

```mermaid
flowchart TD
    START[Officer on report form] --> CLICK[Click: Analyze with AI Assistant]
    CLICK --> REQ[Frontend calls POST /api/ai/report-assist with check action]
    REQ --> BACKEND[Backend AI Service]
    BACKEND --> GEMINI[Official SDK calls Gemini generateContent]
    GEMINI --> RESP[Google AI Studio returns analysis findings]
    RESP --> LOG[Technical metadata logged to activity_logs]
    LOG --> RETURN[Return analysis to frontend]
    RETURN --> CARD[Analysis displays in AI Analysis Card]
    CARD --> REVIEW[Officer reviews scores and recommendations]
    REVIEW --> APPLY[Officer applies changes as they see fit]
```

**Key points:**

- Analysis covers grammar, clarity, completeness, consistency, and missing information.
- The analysis is for assistance only.
- The officer decides what, if anything, to change.

---

## 7. Submit Report

```mermaid
flowchart TD
    START[Officer on report form - draft] --> CLICK[Click: Submit Report]
    CLICK --> CONFIRM[Confirmation dialog]
    CONFIRM -->|Cancel| BACK[Back to form]
    CONFIRM -->|Confirm| VALIDATE[Validate required fields]
    VALIDATE -->|Missing required| ERR[Show validation errors; cannot submit]
    ERR --> BACK
    VALIDATE -->|OK| SUBMIT[Backend marks report as submitted]
    SUBMIT --> LOCK[Report becomes read-only]
    LOCK --> DONE[Redirect to My Reports]
```

**Key points:**

- Submitting changes status from `draft` to `submitted`.
- `submitted_at` is recorded.
- After submission, the report cannot be edited.
- There is no approval step — submission is final.

---

## 8. View Own Reports

```mermaid
flowchart TD
    START[Officer on dashboard] --> CLICK[Click: My Reports]
    CLICK --> LIST[List of officer's own reports]
    LIST --> SEARCH[Search / filter by status, type, date]
    SEARCH --> FILTERED[Filtered list]
    FILTERED --> VIEWALL[View any own report]
    VIEWALL --> DETAILS[Report details page / print view]
```

**Notes:**

- Officers only ever see their own reports.
- Ownership is enforced on the backend, not just the UI.

---

## 9. Print Report

```mermaid
flowchart TD
    START[View a report] --> CLICK[Click: Print]
    CLICK --> FORMAT[Open print-friendly view]
    FORMAT --> PRINT[Browser print dialog]
    PRINT -->|Print / Save PDF| DONE[Printable report output]
```

**Notes:**

- Available to officers for their own reports.
- Available to admins for any report.
- Print view is clean and professional.

---

## 10. Manage Officers (Admin)

```mermaid
flowchart TD
    START[Admin dashboard] --> CLICK[Click: Officers]
    CLICK --> LIST[List of officers]
    LIST --> CREATE[Create new officer]
    LIST --> EDIT[Edit officer details]
    LIST --> STATUS[Enable / disable officer]
    STATUS --> CONFIRM[Confirmation]
    CONFIRM --> UPDATE[Status updated: active or disabled]
    UPDATE --> NOTE[Historical reports remain associated]
    NOTE --> LIST
```

**Key points:**

- Officers are **disabled**, never deleted.
- A disabled officer cannot log in.
- Disabling preserves report history.

---

## 11. Admin View Reports

```mermaid
flowchart TD
    START[Admin dashboard] --> CLICK[Click: Reports]
    CLICK --> LIST[View all reports]
    LIST --> SEARCH[Search / filter by status, type, officer, date]
    SEARCH --> FILTERED[Filtered list]
    FILTERED --> VIEW[View any report]
    VIEW --> PRINT[Print report]
```

**Notes:**

- Admins can view all reports but **cannot approve or edit** them.
- There is no approval workflow.

---

## 12. Activity Logs (Admin)

```mermaid
flowchart TD
    START[Admin dashboard] --> CLICK[Click: Activity Logs]
    CLICK --> LIST[View activity logs]
    LIST --> FILTER[Filter by user, action, date]
    FILTER --> RESULT[Filtered log entries]
    RESULT --> DETAIL[View entry details]
```

**Notes:**

- Logs record user actions (login, report creation, submission, AI usage, etc.).
- Accessible to admins only.

---

## Flow Summary

| # | Flow | Primary Actor | Key Rule |
|---|------|---------------|----------|
| 1 | Officer Login | Officer | Disabled accounts cannot log in |
| 2 | Admin Login | Admin | Disabled accounts cannot log in |
| 3 | Create Draft | Officer | New reports are drafts |
| 4 | Edit Draft | Officer | Only own drafts can be edited |
| 5 | Generate AI Narrative | Officer | AI output is editable; no auto-submit |
| 6 | Analyze Report | Officer | AI is assistance only |
| 7 | Submit Report | Officer | Final; no approval step |
| 8 | View Own Reports | Officer | Own reports only |
| 9 | Print Report | Officer / Admin | Clean print view |
| 10 | Manage Officers | Admin | Disable, never delete |
| 11 | Admin View Reports | Admin | View only, no approval |
| 12 | Activity Logs | Admin | Audit trail |

---

## Status

This document describes the **planned user flows**. Implementation has not started yet. The project is **under development**.