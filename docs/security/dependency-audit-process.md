# Dependency Update & Audit Process

Addresses Risk #5 (System Application / Software Attack) gap: **"No
dependency update process — no scheduled `npm audit`, no
`package-lock.json` drift check."**

## Automated check (every push/PR)

`.github/workflows/ci.yml` runs `npm audit --omit=dev --audit-level=high`
for both `backend/` and `frontend/` on every push and pull request
(`main`, `master`, and `develop` branches). A High or Critical finding
fails the build.

This catches *new* vulnerable dependencies at merge time, but does not catch
vulnerabilities newly *disclosed* in packages already merged — that's what
the monthly check below is for.

## Monthly manual check

**Cadence:** first working day of each month.
**Owner:** rotate across the team, or assign a fixed owner — decide and
record here: `_____________________`.

Steps:

1. ```bash
   cd backend && npm audit --omit=dev
   cd ../frontend && npm audit --omit=dev
   ```
2. For each finding, record it in the table below (or a linked issue).
3. Triage by severity:

   | Severity | SLA |
   |---|---|
   | Critical | Fix within 48 hours |
   | High | Fix within 1 week |
   | Moderate | Fix within the current sprint/month |
   | Low | Track, fix opportunistically |

4. Where a fix is available: `npm audit fix` (non-breaking) or a manual
   `npm install <pkg>@<version>` for breaking upgrades, followed by running
   the full test suite (`npm test` in `backend/`, `npm run build` in
   `frontend/`) before merging.
5. Where no fix is available yet: document the accepted risk (why it's not
   exploitable in this app's usage, or that it's awaiting upstream), and
   set a reminder to re-check next cycle.
6. Also check for general `package-lock.json` drift:
   ```bash
   npm outdated
   ```
   and evaluate whether to schedule upgrades for majors that are getting
   old (>1 year behind), even absent a CVE.

## Known transitive-dependency pin

`backend/package.json` carries an npm `overrides` entry pinning **all**
nested copies of `mysql2` to the version declared at the top level:

```json
"overrides": { "mysql2": "$mysql2" }
```

Why: `express-mysql-session` declares a broad mysql2 range and npm resolved
it to an old 3.10.2 nested copy with known HIGH advisories (plaintext
credential leak via auth-plugin downgrade, decompression-bomb DoS), even
though the app's own mysql2 was patched. The override forces the nested
copy onto the same patched release. **Re-check this override whenever
`express-mysql-session` is upgraded** — once upstream declares a patched
minimum, the override can be removed.

## Audit log

| Date | Backend findings | Frontend findings | Actions taken | Owner |
|---|---|---|---|---|
| 2026-09-06 | 3 (1 high, 2 moderate): nested `mysql2@3.10.2` under express-mysql-session (GHSA-3f6p-5ww8-9rcr, GHSA-rgwj-5xj2-c3m3) + `qs@6.15.3` moderate ×2 | 0 | Added `overrides: { mysql2: "$mysql2" }` to `backend/package.json`, regenerated lockfile — nested mysql2 now 3.24.3. `npm audit --omit=dev --audit-level=high` now clean for both workspaces. Full backend test suite re-run: PASS. (qs moderates cleared by express 5 dependency refresh during the same reinstall.) | Buffy (AI) |

## Notes

- `npm audit --omit=dev` is used (the deprecated `--production` flag prints
  a warning on current npm) to exclude devDependencies that never ship to
  users — reduces noise from tooling packages that don't affect runtime
  security.
- If a Critical/High finding cannot be fixed within its SLA (no patched
  version exists, or the fix is a breaking major-version upgrade requiring
  larger testing), escalate rather than letting the SLA silently lapse —
  add it to the next security review (see `docs/security/pre-release-checklist.md`).
