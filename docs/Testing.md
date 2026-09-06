# BLUEWRITE — Testing Strategy

---

## 1. Overview

This document describes the planned testing strategy for BLUEWRITE. Testing will be carried out in **Phase 9 (Testing)** after the implementation phases are complete.

**Current status: All test cases are marked NOT TESTED.**

---

## 2. Testing Approach

Testing is performed across multiple layers:

| Layer | Focus |
|-------|-------|
| Authentication | Login, tokens, disabled accounts |
| Authorization | Role-based and ownership-based access |
| Report lifecycle | Create, edit, submit, view, search, print |
| Admin features | Officer management, reports, logs |
| Database | Schema, queries, constraints, integrity |
| API | Endpoint behavior, validation, error handling |
| AI | Narrative generation, report analysis, logging |
| UI | Components, pages, flows, states |
| Responsive | Desktop, tablet, mobile |
| Security | Injection, secrets, access control |

---

## 3. Test Categories

### 3.1 Authentication Testing

- Login with valid credentials succeeds.
- Login with invalid credentials fails.
- Disabled account cannot log in.
- A MySQL-backed server-side session is created on successful login.
- `/api/auth/me` returns the current user.
- Frontend redirects correctly by role.
- Five failed Officer attempts require an Administrator unlock.
- Five failed Administrator attempts cause a temporary lock and required Security Review.
- Login/security audit records include source IP addresses.
- Admin can reset an Officer password and receives the temporary password only once.
- Admin password changes require at least 16 characters.
- Offline TOTP/recovery codes are reserved and are not part of this test phase.
- Officer password success creates only a restricted pending email-verification session.
- Wrong, expired, over-attempt, reused, and superseded email codes are rejected.
- Correct Officer email code creates the authenticated session.
- Verification codes and digests are absent from API responses and audit logs.
- Admin can edit unique Officer emails; invalid or duplicate emails are rejected.

### 3.2 Authorization Testing

- Officer cannot access admin endpoints (403).
- Officer cannot access another officer's report (403).
- Admin can access admin endpoints.
- Admin can view all reports.
- Submitted reports cannot be edited (403).
- Only the owning officer can edit a draft.

### 3.3 Report Testing

- Create a draft report.
- Edit an own draft.
- Cannot edit another officer's draft.
- Cannot edit a submitted report.
- Submit a report (status → submitted, `submitted_at` set).
- View own reports only.
- Search/filter reports.
- Print report output.

### 3.4 Admin Testing

- Create an officer.
- Edit an officer.
- Disable an officer (officer cannot log in).
- Re-enable an officer (officer can log in).
- Disabled officer's reports remain visible.
- View all reports.
- View activity logs.
- Filter logs.

### 3.5 Database Testing

- `schema.sql` loads without errors.
- ENUM constraints enforced (roles, user statuses, report statuses).
- Foreign keys enforced.
- Unique constraints enforced (username, email, badge, report number).
- Parameterized queries work.
- No approval status exists in the schema.

### 3.6 API Testing

- All endpoints return the documented response format.
- Invalid payloads return 400.
- Missing/invalid token returns 401.
- Insufficient role returns 403.
- Not found returns 404.
- Server errors return 500.

### 3.7 AI Testing

- Generate Report returns an editable structured report draft based on the supplied narrative.
- Supported report fields and the professional narrative appear in the editable form; unsupported fields remain blank.
- Analyze report returns findings.
- Analysis displays in the AI Analysis Card.
- Technical AI audit metadata is created without storing full prompts or reports.
- Frontend never calls Google AI Studio directly and never receives the API key.
- AI service unavailable returns a clear error.
- Officer data is not lost on AI failure.

### 3.8 UI Testing

- All pages render without errors.
- Login page works.
- Officer pages: Dashboard, My Reports, Create Report, Edit Report, Profile.
- Admin pages: Dashboard, Officers, Reports, Activity Logs, Profile.
- Loading states display.
- Empty states display.
- Confirmation dialogs work.
- Navigation works for both roles.

### 3.9 Responsive Testing

- Desktop layout correct.
- Tablet layout correct.
- Mobile layout correct.
- Sidebar collapses on small screens.
- Tables are usable on small screens.
- Forms usable on mobile.

### 3.10 Security Testing

- SQL injection attempts are blocked.
- No plaintext passwords stored.
- JWT secret loaded from environment.
- No secrets in source control.
- Role and ownership checks enforced on backend.
- Input validation on both frontend and backend.

---

## 4. Test Case Table

| ID | Feature | Test | Expected Result | Status |
|----|---------|------|-----------------|--------|
| TC-001 | Authentication | Officer logs in with valid credentials | Redirect to officer dashboard with valid token | NOT TESTED |
| TC-002 | Authentication | Admin logs in with valid credentials | Redirect to admin dashboard with valid token | NOT TESTED |
| TC-003 | Authentication | Login with invalid credentials | Error shown, no token issued | NOT TESTED |
| TC-004 | Authentication | Disabled account attempts login | Login denied with clear message | NOT TESTED |
| TC-005 | Authentication | `/api/auth/me` with valid session | Returns current user data | AUTOMATED PASS |
| TC-006 | Authentication | `/api/auth/me` without session | Returns 401 | AUTOMATED PASS |
| TC-007 | Authorization | Officer accesses admin endpoint | Returns 403 | NOT TESTED |
| TC-008 | Authorization | Officer views another officer's report | Returns 403 | NOT TESTED |
| TC-009 | Authorization | Officer edits another officer's draft | Returns 403 | NOT TESTED |
| TC-010 | Authorization | Officer edits a submitted report | Returns 403 | NOT TESTED |
| TC-011 | Authorization | Admin views all reports | Reports from all officers visible | NOT TESTED |
| TC-012 | Report | Officer creates a report | Draft created with unique report number | NOT TESTED |
| TC-013 | Report | Officer edits own draft | Changes persist, status stays draft | NOT TESTED |
| TC-014 | Report | Officer submits a draft | Status becomes submitted, `submitted_at` set | NOT TESTED |
| TC-015 | Report | Officer views own reports | Only own reports listed | NOT TESTED |
| TC-016 | Report | Officer searches own reports | Filtered results returned | NOT TESTED |
| TC-017 | Report | Officer prints a report | Print view renders correctly | NOT TESTED |
| TC-018 | Report | Create report missing required field | Validation error, no report created | NOT TESTED |
| TC-019 | Admin | Admin creates an officer | Officer appears in list with default status | NOT TESTED |
| TC-020 | Admin | Admin edits an officer | Changes persist | NOT TESTED |
| TC-021 | Admin | Admin disables an officer | Officer cannot log in; data preserved | NOT TESTED |
| TC-022 | Admin | Admin re-enables an officer | Officer can log in again | NOT TESTED |
| TC-023 | Admin | Disabled officer's reports remain | Reports still visible to admin | NOT TESTED |
| TC-024 | Admin | Admin views all reports | All reports listed with filters | NOT TESTED |
| TC-025 | Admin | Admin views activity logs | Logs listed and filterable | NOT TESTED |
| TC-026 | Database | `schema.sql` executes | Tables created without errors | NOT TESTED |
| TC-027 | Database | Role ENUM constraint | Only `admin`/`officer` accepted | NOT TESTED |
| TC-028 | Database | User status ENUM constraint | Only `active`/`disabled` accepted | NOT TESTED |
| TC-029 | Database | Report status ENUM constraint | Only `draft`/`submitted` accepted | NOT TESTED |
| TC-030 | Database | Unique constraints enforced | Duplicate username/email/badge/report number rejected | NOT TESTED |
| TC-031 | Database | Foreign keys enforced | Invalid `officer_id` rejected | NOT TESTED |
| TC-032 | Database | No approval status exists | Schema has no approval column/value | NOT TESTED |
| TC-033 | API | POST `/api/auth/login` valid | 200 with token and user | NOT TESTED |
| TC-034 | API | POST `/api/auth/login` invalid | 401 with error | NOT TESTED |
| TC-035 | API | GET `/api/reports` as officer | Own reports only with pagination | NOT TESTED |
| TC-036 | API | POST `/api/reports` | 201, report created as draft | NOT TESTED |
| TC-037 | API | GET `/api/reports/:id` as owner | 200 with report data | NOT TESTED |
| TC-038 | API | GET `/api/reports/:id` as non-owner | 403 | NOT TESTED |
| TC-039 | API | PUT `/api/reports/:id` on submitted | 403 | NOT TESTED |
| TC-040 | API | PATCH `/api/reports/:id/submit` on draft | 200, status submitted | NOT TESTED |
| TC-041 | API | GET `/api/officers` as admin | 200 with officer list | NOT TESTED |
| TC-042 | API | GET `/api/officers` as officer | 403 | NOT TESTED |
| TC-043 | API | POST `/api/officers` as admin | 201, officer created | NOT TESTED |
| TC-044 | API | PATCH `/api/officers/:id/status` | 200, status updated | NOT TESTED |
| TC-045 | API | GET `/api/dashboard/admin` | 200 with stats | NOT TESTED |
| TC-046 | API | GET `/api/dashboard/officer` | 200 with stats | NOT TESTED |
| TC-047 | API | GET `/api/logs` as admin | 200 with logs | NOT TESTED |
| TC-048 | API | GET `/api/logs` as officer | 403 | NOT TESTED |
| TC-049 | API | GET `/api/profile` | 200 with current user | NOT TESTED |
| TC-050 | API | PUT `/api/profile` | 200, profile updated | NOT TESTED |
| TC-051 | API | PUT `/api/profile/password` correct current | 200, password changed | NOT TESTED |
| TC-052 | API | PUT `/api/profile/password` wrong current | 400, password not changed | NOT TESTED |
| TC-053 | AI | Generate report from narrative | Returns supported editable report fields; unsupported fields remain blank | AUTOMATED PASS |
| TC-054 | AI | Analyze report | Returns findings in analysis card | NOT TESTED |
| TC-055 | AI | AI audit created | Provider, model, outcome, and validation metadata recorded without full report content | AUTOMATED PASS |
| TC-056 | AI | Frontend does not call Google AI Studio directly | No Google AI Studio SDK/key/provider URL in frontend source or build | AUTOMATED PASS |
| TC-057 | AI | Google AI Studio unavailable or unconfigured | Controlled error shown; entered data preserved | AUTOMATED PASS |
| TC-058 | AI | AI never auto-submits | No auto-submit behavior observed | NOT TESTED |
| TC-059 | UI | Login page renders | Form renders and validates | NOT TESTED |
| TC-060 | UI | Officer dashboard renders | Stats and navigation render | NOT TESTED |
| TC-061 | UI | Admin dashboard renders | Stats and navigation render | NOT TESTED |
| TC-062 | UI | Report form renders | All sections render | NOT TESTED |
| TC-063 | UI | Loading states display | Spinner during async operations | NOT TESTED |
| TC-064 | UI | Empty states display | Clear message when no data | NOT TESTED |
| TC-065 | UI | Confirmation dialogs work | Confirm/cancel behave correctly | NOT TESTED |
| TC-066 | Responsive | Desktop layout | Correct multi-column layout | NOT TESTED |
| TC-067 | Responsive | Tablet layout | Sidebar collapses, stacked cards | NOT TESTED |
| TC-068 | Responsive | Mobile layout | Single-column, usable forms | NOT TESTED |
| TC-069 | Security | SQL injection attempt | Blocked, no data leak | NOT TESTED |
| TC-070 | Security | Plaintext password stored | Never stored plaintext | NOT TESTED |
| TC-071 | Security | Secrets in source control | No secrets committed | NOT TESTED |
| TC-072 | Security | Backend role/ownership enforcement | Not bypassable via API | NOT TESTED |

---

## 5. Testing Status

| Category | Status |
|----------|--------|
| Authentication | NOT TESTED |
| Authorization | NOT TESTED |
| Report Testing | NOT TESTED |
| Admin Testing | NOT TESTED |
| Database Testing | NOT TESTED |
| API Testing | NOT TESTED |
| AI Testing | NOT TESTED |
| UI Testing | NOT TESTED |
| Responsive Testing | NOT TESTED |
| Security Testing | NOT TESTED |

All test cases are performed and recorded in **Phase 9 (Testing)**.

---

## 6. Status

This document describes the **planned testing strategy**. No tests have been executed yet. The project is **under development**.