# Risk Register Implementation Status — BLUEWRITE

Audit of the **Risk Detective Challenge** register (Jayme, Shaine B. / Tajanlangit, Louis P. / Tapic, Roegie) against the current codebase. Verified September 6, 2026.

**Legend:** ✅ Implemented · 🟡 Partially implemented · ❌ Not implemented

---

## Summary Table

| # | Asset | Threat | Vulnerability | Likelihood | Impact | Risk Score | Control | Status |
|---|-------|--------|---------------|------------|--------|------------|---------|--------|
| 1 | Police Incident Records | Unauthorized Access | Weak Access Control | ★★★★ | ★★★★★ | 20 (Critical) | Authentication and role-based access | ✅ Implemented |
| 2 | AI Report Generator | Incorrect Report Output | Incomplete Input Data | ★★★ | ★★★★ | 12 (Medium) | User review and validation | ✅ Implemented |
| 3 | Database | Data Loss | No Regular Backup | ★★★ | ★★★★★ | 15 (Critical) | Backup and recovery plan | ✅ Implemented |
| 4 | User Accounts | Account Compromise | Weak Passwords | ★★★★ | ★★★★ | 16 (Critical) | Strong password policy and monitoring | ✅ Implemented |
| 5 | System Application | Software Attack | Security Vulnerabilities | ★★★ | ★★★★ | 12 (Medium) | Regular updates and security testing | 🟡 Partially implemented *(gaps narrowed 2026-09-06; CI unexecuted, test coverage incomplete)* |

---

## 1. Police Incident Records — Unauthorized Access

**Control: Authentication and role-based access — ✅ Implemented**

Evidence in the codebase:

- **Session authentication** on every API group (`backend/src/app.js`): all routes under `/api/auth`, `/api/officers`, `/api/reports`, `/api/activity-logs`, `/api/dashboard`, and `/api/ai` mount `requireAuth`.
- **Role-based access control** (`backend/src/middleware/auth.js`): `requireRole('admin')` guards officer management and activity logs; `requireRole('officer')` guards AI routes; reports are shared `('officer','admin')` with ownership checks in the service layer (`officer_id` scoping in SQL).
- **Defense in depth on login** (`backend/src/services/authService.js`): account lockout after repeated failures, temporary admin lock windows, admin IP allow-list (`ADMIN_IP_NOT_ALLOWED`), and officer account-active checks.
- **Session hardening** (`backend/src/app.js`, `middleware/auth.js`): httpOnly + SameSite=strict cookies, secure cookies in production, absolute session max age, and shorter idle timeouts for admins.
- **Frontend route guards** (`frontend/src/components/... PrivateRoute`): role-gated pages with redirects, forced password-change and security-review gates.
- **Every denied attempt is logged** as `UNAUTHORIZED_ACCESS_ATTEMPT` in the activity trail.
- Tests: `backend/test/authSecurity.test.js`.

**No gaps identified** for the scope of this control.

---

## 2. AI Report Generator — Incorrect Report Output

**Control: User review and validation — ✅ Implemented**

Evidence in the codebase:

- **Officer stays the author**: AI output is always a *suggestion* that the officer reviews and explicitly applies; the UI states this in the AI panel and login advisory.
- **Input safety gates** (`backend/src/services/aiService.js`): writing-intent allow-list and unsafe-request refusal (`AI_WRITING_REQUEST_REJECTED`) — the assistant refuses to invent facts, decide guilt, or produce unrelated content.
- **Factual consistency validation**: `factualConsistencyValidation()` + `sanitizeGeneratedReportFields()` reject AI-proposed fields (dates, times, locations, names, types) that are not supported by the officer's own source text.
- **Canonical field merge**: officer-entered values always win over AI proposals (`mergeCanonicalReportFields`).
- **Guided Q&A extraction is schema-constrained** and falls back to deterministic local parsing when the AI is unavailable.
- **Decision logging**: accept/reject decisions (`AI_SUGGESTION_ACCEPTED` / `AI_SUGGESTION_REJECTED`) and factual-difference warnings are recorded in activity logs.
- Tests: `backend/test/aiSafety.test.js`.

**No gaps identified** for the scope of this control.

---

## 3. Database — Data Loss

**Control: Backup and recovery plan — ✅ Implemented (2026-09-06)**

Implemented and **verified with a real backup + restore test** (full runbook: `docs/fixes/backup-recovery.md`):

- **Backup script** `backend/scripts/backup.sh` (also `npm run backup`): consistent `mysqldump --single-transaction --routines --triggers --events` snapshot, gzip-compressed, 7-day retention pruning, optional GPG encryption.
- **Least-privilege backup user** `bluewrite_backup@localhost` created with only `SELECT, PROCESS, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER` — verified read-only (cannot modify data or schema); grants via `backend/scripts/create-backup-user.sql`.
- **Restore script** `backend/scripts/restore.sh` (also `npm run restore`) with a safety guard that refuses to overwrite the live database name.
- **Restore test passed 2026-09-06**: backup `bluewrite-2026-09-06_205650.sql.gz` (12.5 KB) restored into sandbox `bluewrite_restore_test`; row counts matched the live database exactly — users 3=3, officers 2=2, reports 11=11, report_people 15=15, activity_logs 297=297, auth_sessions 1=1.
- **Credentials & outputs are gitignored** (`backend/scripts/backup.env`, `backend/backups/`).
- **Scheduling**: Task Scheduler command documented in the runbook (Windows host; to be installed on the deployment machine — see §4 of the runbook).

**Outstanding (documented in the runbook, not blockers to the control):** enable GPG encryption at rest (key pair to be generated on the admin machine — exact commands in runbook §3), install the Task Scheduler job on the deployment host, and repeat the restore test quarterly (next due ~2026-12-06).

---

## 4. User Accounts — Account Compromise

**Control: Strong password policy and monitoring — ✅ Implemented**

Evidence in the codebase:

- **Strong password policy** (`backend/src/utils/password.js`): minimum 12 characters, must include letter + number + special character, common-password blocklist, and rejection of username/badge-number matches. Bcrypt cost 12 for storage.
- **Temporary passwords**: admin-created accounts and admin password resets generate a 16-char cryptographically random password (`crypto.randomInt` + secure shuffle) that **must be changed at first login** (`must_change_password=TRUE`, enforced by `requirePasswordChangeComplete`).
- **Brute-force monitoring and lockout** (`backend/src/services/authService.js`): failed-attempt counters per user, automatic account lockout (`ACCOUNT_LOCKED`), admin temporary lock windows, and **login rate limiting** (`express-rate-limit` on auth routes).
- **Security review gate**: suspicious events can force a `security_review_required` state that blocks API access until the administrator completes a review.
- **Full audit trail** (`activity_logs`): `LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `LOGIN_THROTTLED`, `PASSWORD_RESET_BY_ADMIN`, `ACCOUNT_UNLOCKED`, `SESSION_EXPIRED`, etc. — surfaced in the admin dashboard security banner (last-24h events) and the Activity Logs page with red highlighting.
- **Session revocation on compromise**: disabling an officer or resetting a password destroys all their sessions and pending verification challenges.

**Minor hardening ideas (optional, not gaps):** add periodic password expiry for officer accounts, and alert on successful logins from a new IP for the same account.

---

## 5. System Application — Software Attack

**Control: Regular updates and security testing — 🟡 Partially implemented**

Implemented:

- **Security headers** via `helmet` (`backend/src/app.js`).
- **Strict CORS allow-list** (fixed dev origins + credentials, cross-origin unsafe-method blocking) — must be updated for production domains at deploy time.
- **Rate limiting** on login and AI endpoints.
- **Security tests exist**: `backend/test/authSecurity.test.js`, `backend/test/aiSafety.test.js`, and `backend/test/reportFlow.test.js` (added 2026-09-06) cover auth flows, AI safety gates, and the report-merge/validation pipeline. Run together via `npm test` in `backend/`.
- **Input validation** on all write endpoints (officer create/update, report validation, AI request validation) and parameterized SQL throughout (no string-built queries with user input).
- **Dependency update process** *(added 2026-09-06)*: documented monthly `npm audit` cadence with triage SLAs in `docs/security/dependency-audit-process.md`, including a real first audit-log entry. A live HIGH finding (nested `mysql2@3.10.2` under `express-mysql-session`) was fixed the same day via an npm `override` pinning nested mysql2 to the patched top-level version — both workspaces now audit clean at `--audit-level=high`.
- **CI pipeline** *(added 2026-09-06)*: `.github/workflows/ci.yml` runs backend tests + `npm audit --omit=dev --audit-level=high` and a frontend production build + audit on every push/PR to `main`/`master`/`develop`. ⚠️ *Not yet executed in GitHub Actions — the project is not currently hosted in a git repository; the workflow must be observed running (and the audit-fail path spot-checked) once the repo is pushed to GitHub.*
- **Pre-release security checklist** *(added 2026-09-06)*: `docs/security/pre-release-checklist.md`, adapted to real file locations; its first pass already flags the dev-only CORS list as a deploy blocker.

Gaps:

1. **CI not yet executed** — the workflow exists but GitHub Actions has never run it (no git remote yet). Must be verified green (and the audit-fail behavior spot-checked) after the repository is hosted.
2. **Test coverage still incomplete** — the deterministic report-merge/validation logic is now tested (`reportFlow.test.js`), but officer status transitions, the full lockout state machine, route-level report persistence, and the frontend (no test runner at all) remain open. Tracked with priorities in `docs/security/testing-gaps.md`.
3. **CORS origins are dev-only** — the production allow-list change is a hard release-blocker item on the pre-release checklist.

---

## Verification Pointers

| Control claim | Where to verify |
|---|---|
| Auth + RBAC on every route | `backend/src/app.js`, `backend/src/routes/*.js`, `backend/src/middleware/auth.js` |
| AI output safety | `backend/src/services/aiService.js`, `backend/test/aiSafety.test.js` |
| Password policy | `backend/src/utils/password.js` |
| Lockout + monitoring | `backend/src/services/authService.js`, `frontend/src/pages/admin/ActivityLogsPage.jsx` |
| Backup + verified restore | `backend/scripts/backup.sh`, `backend/scripts/restore.sh`, restore test log in `docs/fixes/backup-recovery.md` §6 |
| Security testing | `backend/test/`, `docs/Testing.md` (many TC rows marked NOT TESTED) |
| Dependency audit + CI | `.github/workflows/ci.yml`, `docs/security/dependency-audit-process.md` (audit log), `npm audit --omit=dev --audit-level=high` in both workspaces (clean as of 2026-09-06) |
| Pre-release review | `docs/security/pre-release-checklist.md` |
| Test coverage tracking | `docs/security/testing-gaps.md` |
