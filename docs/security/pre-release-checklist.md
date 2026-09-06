# Pre-Release Security Checklist

Addresses Risk #5 (System Application / Software Attack) gap: **"No
penetration/security review checklist in docs."**

Run through this before every production deploy / release tag. Check each
box only after actually verifying it — do not check a box from memory of
"we set this up once."

## Headers & transport

- [ ] `helmet` middleware is active on the production server
      (`backend/src/app.js` — confirmed present as of 2026-09-06).
- [ ] HTTPS is enforced (HTTP requests redirect to HTTPS, or are rejected at
      the load balancer/proxy). *Currently N/A — app runs local HTTP; enforce
      before any real deployment.*
- [ ] Session cookies have `secure=true` in production. The app sets this
      automatically when `NODE_ENV=production`
      (`backend/src/app.js`, `sessionCookieOptions.secure`) — confirm
      `NODE_ENV` is actually set on the deploy target.
- [ ] Session cookies remain `httpOnly` and `SameSite=strict`
      (`backend/src/app.js`, same line — verified 2026-09-06).

## CORS

- [ ] The CORS allow-list in `backend/src/app.js` (the `allowedOrigins`
      constant) contains **only** the real production frontend origin(s).
      ⚠️ **As of 2026-09-06 it hard-codes five `localhost:517x` dev
      origins** — this box CANNOT be checked until that list is
      production-config-driven. Treat as a release blocker.
- [ ] Cross-origin unsafe-method requests are still blocked in production
      (the second origin-check middleware in `backend/src/app.js`).

## Access control

- [ ] Admin IP allow-list is enabled and contains the correct current IPs
      (verify its actual config location before deploy).
- [ ] Spot-check: log in as a non-admin officer account and confirm
      admin-only routes (`requireRole('admin')` on
      officers/reports/activity-logs/dashboard/backups routers) reject
      with 403.
- [ ] Spot-check: a logged-out request to a protected route returns 401
      (covered by `backend/test/authSecurity.test.js`, but re-verify
      manually after any auth change).

## Secrets & credentials

- [ ] All secrets (DB password, session secret, GPG passphrase, Gemini API
      key, SMTP creds) are rotated if this is the first production deploy,
      or if anyone with prior access has left the team.
- [ ] No secrets in deployed git history (`git log -p` spot-check or a
      secret-scanning tool).
- [ ] `backend/.env`, `backend/scripts/backup.env`, and equivalents are
      **not** committed: `git ls-files | grep -iE "\.env"` must return
      nothing (both are listed in `backend/.gitignore` — verify against the
      actual repo once hosted).

## Dependencies

- [ ] `npm audit --omit=dev --audit-level=high` clean for both `backend/`
      and `frontend/` (or findings documented as accepted risks per
      `docs/security/dependency-audit-process.md`).
- [ ] CI (`.github/workflows/ci.yml`) is green on the commit being deployed.

## Backups (Risk #3 cross-check)

- [ ] The most recent nightly backup exists and is non-empty
      (`backend/backups/` or the admin Backups page:
      `http://localhost:5173/admin/backups`).
- [ ] A restore test has been performed within the last quarter (see
      `docs/fixes/backup-recovery.md` §6, or use the one-click **Verify**
      button on the admin Backups page and record the result).

## Testing

- [ ] Full backend test suite passes (`npm test` in `backend/` — runs
      `test/aiSafety.test.js` + `test/authSecurity.test.js`).
- [ ] Auth/security-critical flows (login, lockout, role checks) were
      manually smoke-tested in the pre-prod/staging environment, not just
      unit-tested.
- [ ] Any `docs/Testing.md` rows marked "NOT TESTED" that touch this
      release's changed code have been either tested or explicitly
      deferred with a reason.

## Sign-off

| Field | Value |
|---|---|
| Release / tag | |
| Date | |
| Reviewer | |
| All boxes checked? | Y / N |
| Deferred items (with reason) | |
