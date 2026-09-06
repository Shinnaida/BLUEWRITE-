# Test Coverage Gaps

Addresses Risk #5 (System Application / Software Attack) gap: **"Limited
test coverage — only 2 backend test files; frontend has no tests."**

This is a tracking doc, not a finished test suite — writing the actual tests
is real engineering work that should happen incrementally. Use this to keep
it from being silently forgotten.

Current state (2026-09-06): backend tests live in `backend/test/`
(`aiSafety.test.js`, `authSecurity.test.js`, `reportFlow.test.js`), run
together via `npm test` in `backend/`. The frontend has **no test runner
configured at all** — `frontend/package.json` has no `test` script. CI
currently gates the frontend on `npm run build` until that changes.

## Priority order (per the audit's recommendation)

1. **Report submit flow** (backend) — covers the AI Report Generator's
   validation/merge logic (Risk #2) as well as basic CRUD correctness.
   - [x] Officer-entered fields win over AI-proposed fields
         (`mergeCanonicalReportFields`) — `reportFlow.test.js`, 2026-09-06.
   - [x] Factually-inconsistent AI fields are rejected — the
         `sanitizeGeneratedReportFields` half is covered
         (`reportFlow.test.js`: unsupported type/date/time/location and
         person-role attachment rejected + blanked; supported fields pass).
   - [ ] Full happy path through the actual submit **route** with a live
         database (persistence + status codes — needs a DB-backed
         integration harness like `authSecurity.test.js` uses).
   - [x] Ownership scoping: officer A cannot submit/edit a report under
         officer B's `officer_id` — covered at the route layer in
         `authSecurity.test.js` ("ownership" in its passing summary).
   *(First increment written 2026-09-06: `backend/test/reportFlow.test.js`,
   6 passing assertions, no DB required.)*

2. **Officer status transitions** (backend) — account
   active/inactive/locked state changes.
   - [ ] Admin disabling an officer destroys their active sessions.
   - [ ] Disabled officer cannot authenticate.
   - [ ] Re-enabling restores access correctly (no stale lock state).

3. **Auth lockout state machine** (backend) — extends the existing
   `authSecurity.test.js`.
   - [x] N failed attempts triggers `ACCOUNT_LOCKED` *(covered in the
         existing suite — "lockout" confirmed in its passing output)*.
   - [ ] Lockout expires/clears correctly after the configured window.
   - [ ] Admin temporary lock window behaves distinctly from user lockout.
   - [ ] Rate limiting on login actually throttles (not just configured,
         but observably triggers `LOGIN_THROTTLED`).

4. **Frontend — currently zero tests.** First steps would be adding a
   runner (Vitest matches the existing Vite setup), then:
   - [ ] `PrivateRoute` / role-gated redirect behavior.
   - [ ] Forced password-change and security-review gate rendering.
   - [ ] AI panel: suggestion accept/reject actually calls the right
         handlers (not full E2E — component-level is fine to start).

5. **Backup/restore service** (backend, new since the original audit) —
   the admin backup endpoints run shell pipelines and filesystem ops.
   - [ ] `getBackupFilePath` rejects path traversal / non-whitelisted names
         (manually verified 2026-09-06; worth automating — no DB needed).
   - [ ] `verifyBackupAndLog` sandbox lifecycle: sandbox created, counted,
         dropped even on failure.

## Status

| Area | Tests exist? | Owner | Target date |
|---|---|---|---|
| Report submit flow | **Partial** (`reportFlow.test.js` — deterministic logic; route/persistence layer open) | | |
| Officer status transitions | No | | |
| Auth lockout state machine | Partial (`authSecurity.test.js`) | | |
| Frontend (any) | No | | |
| Backup/restore service | No (manually verified only) | | |

Revisit this table at each monthly dependency-audit check-in
(`docs/security/dependency-audit-process.md`) so it doesn't go stale.
