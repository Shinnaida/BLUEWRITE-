# Risk Register — Client Discussion & Demo Guide

**BLUEWRITE — AI-Assisted Police Incident Reporting System**
Prepared for: the client / evaluators
Purpose: translate the 5-row risk register into plain language and give the team a concrete, repeatable demo script for each control. Read this alongside `docs/fixes/risk-register-implementation-status.md`, which is the technical evidence file.

**How to use this doc in a demo:** open the app at `http://localhost:5173`, go to the feature listed under "Demo," and follow the one-liner steps. Every control below has a role to show (admin vs. officer) and a "what breaks if it didn't exist" note, so the client sees both the *what* and the *why*.

---

## 1. Police Incident Records — Unauthorized Access (Critical, risk score 20)

### Plain-language summary
Police incident reports are the most sensitive data in the system. If anyone who isn't logged in — or who isn't the right role — can view or change them, the system is meaningless. This control means: **every API call requires a real session, every screen checks the user's role, and every denied attempt is recorded.**

### What's in the system
- **Login gates everything.** There's no public API that returns a report, an officer, or even health data without a valid session.
- **Roles are enforced server-side.** The backend has separate role types (`admin` and `officer`), and each API group checks the role before doing anything. An officer can't open admin screens; an admin can't post as an officer.
- **Reports belong to an officer.** Even if two officers have access to the reports area, a report is created under one officer's identity and the service layer makes sure that identity is respected.
- **Session hardening.** Cookies are `httpOnly` (a script on the page can't read them) and set with `SameSite=strict` (so a different site can't send them), with an absolute session expiry and shorter idle time for admins.
- **Everything denied is logged.** Unauthorized access attempts go into the activity log with the method, the URL, and the IP — so you can see if someone is poking at the system.

### Demo script
1. Open `http://localhost:5173/login`. Show that the app won't let you see anything without signing in.
2. Log in as **admin** → go to `/admin/officers`, `/admin/reports`, `/admin/activity-logs` — all accessible. Show the admin dashboard.
3. Log out, log in as a regular **officer** (use an officer account, not admin), and show that the admin URLs are unreachable — the officer lands on the officer dashboard, not on admin screens.
4. (Optional, deeper) In the admin Activity Logs, show that denied access attempts appear — and that they include the method, the path, and the IP. This is the "someone tried to poke around and we caught it" story.

### What the client should remember
- "Nobody gets in without a real login, and role screens are enforced on the server, not just hidden in the UI."
- "Every attempt — successful and failed — is written to the audit log."

---

## 2. AI Report Generator — Incorrect Report Output (Medium, risk score 12)

### Plain-language summary
The AI can help an officer write a report faster, but it can also invent facts, change dates, or add evidence that never happened. The system's job here is to make sure **the AI is always the assistant, never the author**, and that anything it proposes that doesn't match the officer's own data gets flagged or blanked out.

### What's in the system
- **Officer first, AI second.** The officer enters the real facts — incident type, date, time, location, summary, narrative, people. The AI then proposes a draft *based on those facts*.
- **The AI can be refused.** There's a safety gate that rejects prompts that ask the AI to invent witnesses, evidence, confessions, guilt, or anything unrelated to a police report.
- **Factual consistency check.** When the AI returns a draft, the system compares it against the officer's entered data. If the draft contains a date, time, location, person, or type that isn't supported by what the officer typed, that field is rejected and blanked — not silently kept.
- **Officer values always win.** If the AI proposes a different incident type, date, or location than what the officer already entered, the officer's value stays. The AI never overwrites the officer's canonical fields.
- **The AI's contribution shows up in the log.** Accept/reject decisions and factual-difference warnings are recorded, so there's a trail of what the officer used from the AI and what they threw out.

### Demo script
1. Log in as an **officer**. Go to `/officer/reports/new` (or reopen a draft) and fill in at least a short narrative and a few facts.
2. Show the **AI Assistant panel** — the officer can ask it to generate a draft *from the facts already entered*.
3. Show the first safety gate: try an AI request that asks to "invent a witness" or "add a weapon that wasn't there" — the system refuses. (This is the "the AI won't make things up" moment.)
4. Show a real, safe generation: the AI returns a structured draft.
5. Show the **factual consistency layer**: in the draft, highlight that any AI-proposed field that doesn't match the officer's data is flagged. Then show the officer **applying only what they agree with** — they keep control of every field.
6. Point out that the officer-entered values stay even if the AI suggests something else — that's the "AI never authors the report" guarantee.

### What the client should remember
- "The AI is a suggestion engine. The officer is the author. Everything in the report is either entered by the officer or explicitly approved from the AI's suggestion."
- "If the AI proposes something the facts don't support, it's rejected — it doesn't quietly land in the report."

---

## 3. Database — Data Loss (Critical, risk score 15)

### Plain-language summary
If the database disappears — disk failure, bad update, accidental delete — the system needs to come back from a known-good copy. This control is the **backup and recovery plan**: automatic daily backups, an on-demand backup button, a way to copy backups to a flash drive, and a way to prove a backup actually restores.

### What's in the system
- **Daily automatic backup at 02:00** (Windows Task Scheduler). Every night the system takes a MySQL dump, compresses it, optionally encrypts it, keeps the last 7 days, and drops older ones.
- **On-demand backup from the admin UI.** In `/admin/backups`, the admin can click "Back Up Now" and create a fresh encrypted snapshot at any time.
- **Flash-drive copy in one click.** The admin Backups page detects attached removable drives and can run a fresh backup and copy the encrypted file straight to the drive — the client's off-site copy without leaving the app.
- **Restore, safely.** Two levels:
  - **Verify** — restores a backup into a throwaway sandbox and shows a side-by-side row-count table (backup vs. live). This proves the backup works, without touching the real database.
  - **Restore** — overwrites the live database with the backup, after the admin **types the word "RESTORE"** to confirm. A single click cannot blow away the live data.
- **Least-privilege backup user.** The backup and restore processes use a database account that can only read — it cannot modify or delete data.
- **Restore tested.** A real backup was restored into a sandbox and the row counts were verified to match the live system.

### Demo script
1. Log in as **admin**. Go to `/admin/backups`.
2. Show the dashboard: number of snapshots, latest backup, and the 02:00 automatic schedule.
3. Click **Back Up Now**. Show the spinner and then the new snapshot appearing in the list.
4. Show the **flash-drive** card: the system detects the attached removable drive, and the admin can click "Back Up to E:" (or whatever letter). Explain that this writes the encrypted backup straight to the drive in `E:\BluewriteBackups\`.
5. Show the **Verify** button on any backup: click it, watch the restore into the sandbox, and show the row-count table that appears (backup vs. live). This is the "our backups actually work" proof.
6. Optionally show the **Restore** button and the red warning modal. Point out that it requires **typing the word RESTORE** before the button becomes enabled — a deliberate speed bump.

### What the client should remember
- "We have automatic nightly backups, an on-demand backup button, and a one-click flash-drive copy."
- "The client can prove a backup restores without risking the live database — the Verify button restores into a sandbox and compares counts."
- "The actual live restore is guarded: it requires typing 'RESTORE'."

---

## 4. User Accounts — Account Compromise (Critical, risk score 16)

### Plain-language summary
Weak passwords and brute-force guessing are how most systems get broken into. This control is the **account security layer**: strong password rules, temporary passwords that must be changed, lockouts after repeated failures, and a full audit trail of who logged in, who failed, who got locked, and who reset a password.

### What's in the system
- **Strong password policy.** Passwords must be long and contain a mix of character types; common or easily guessed passwords are rejected; a password can't be the same as the username or officer badge number.
- **Temporary passwords that force a change.** When an admin creates an officer or resets a password, the system gives the officer a one-time password. The first thing they do after logging in is set their own permanent password.
- **Lockout after repeated failures.** Too many failed logins locks the account. Admins also have a temporary lock window for extra protection.
- **Login rate limiting.** The login endpoint is throttled so repeated guesses slow down rather than succeed.
- **Full audit trail.** Every meaningful account event is logged: login success/failure, lockout, password reset by admin, account unlock, session expiry. These are visible in the admin dashboard's security banner and in the Activity Logs page, where suspicious ones are highlighted in red.
- **Sessions die on compromise.** If an admin disables an officer or resets a password, all that officer's active sessions and pending verification challenges are destroyed.

### Demo script
1. Log in as **admin**. Go to `/admin/officers` and create a new officer, or reset an existing officer's password. Note the temporary password.
2. Have the officer log in with that temporary password and show that the system **forces a password change** before the officer can go further.
3. Show the **lockout behavior**: try a wrong password several times on a test account and show that after enough failures the account locks. (If a live demo would be disruptive, narrate this from the activity log instead — the failures and lockouts are already recorded there.)
4. In the admin dashboard, show the **security banner** ("Recent administrator login security activity") if there are any failures/lockouts in the last 24 hours, and point out the red highlighting in the Activity Logs page.
5. Show the admin **disable/enable** action on an officer — explain that disabling an officer kills their sessions, so a compromised account can be shut off immediately.

### What the client should remember
- "Passwords are strong and can't be everyday words; new or reset accounts get a temporary password that must be changed immediately."
- "Repeated failed logins lock the account — that's the brute-force protection."
- "The admin can see every login success, failure, lockout, and password reset in the activity log, and can kill an officer's sessions instantly if an account is compromised."

---

## 5. System Application — Software Attack (Medium, risk score 12)

### Plain-language summary
Software itself has weaknesses: outdated libraries with known holes, missing safety headers, sloppy input handling, and no way to catch those problems before they reach the client. This control is the **ongoing software hygiene**: security headers, a locked-down CORS policy, rate limiting, dependency auditing, a CI pipeline that runs the tests and the audit on every push, and a pre-release security checklist before anything goes live.

### What's in the system
- **Security headers.** The backend adds headers that help the browser resist some classes of attacks (via `helmet`).
- **Strict CORS.** The backend only accepts requests from known frontend origins; unknown origins are rejected for unsafe operations.
- **Rate limiting.** Login and AI endpoints are rate-limited to make abuse harder.
- **Dependency auditing.** There's a documented monthly cadence for running `npm audit` and triaging findings by severity, plus a log of what was found and fixed.
- **A live HIGH was found and fixed.** During this work, a dependency audit surfaced a high-severity issue in a nested library; it was fixed with a pinned override so the patched version is used everywhere.
- **CI pipeline.** On every push and pull request, GitHub Actions runs the backend tests, the dependency audit (and fails on high/critical findings), and the frontend build and audit. The first run is green on GitHub Actions.
- **Pre-release security checklist.** Before any real deployment, there's a checklist: headers, HTTPS, cookie settings, CORS origins, access control spot-checks, secrets rotation, dependency audit, backup state, and test status. The first pass already flagged that the CORS list still contains only local dev origins — a pre-deployment item to fix.

### Demo script
1. Log in as **admin**. Briefly note that the whole system is behind login and role checks (ties back to Risk #1, but it's also part of app security).
2. Show the **CI pipeline on GitHub**: open `https://github.com/Shinnaida/BLUEWRITE-/actions`, point to the green **CI** run (#1), and explain that every push runs the backend tests, the dependency audit, and the frontend build/audit. A high or critical dependency finding would fail the build.
3. Show the **dependency audit doc**: open `docs/security/dependency-audit-process.md` and point to the real first audit-log entry and the note about the HIGH that was found and fixed. This is the "we don't just say we audit — there's proof."
4. Show the **pre-release checklist**: open `docs/security/pre-release-checklist.md` and walk through a couple of the items — especially the CORS one and the "spot-check admin-only routes" one — as concrete things that will be done before the system goes to a real environment.
5. Optionally, show that the backend routes are mounted with middleware for auth and role checks — point to the code or just narrate it: "every API path is behind requireAuth and, where relevant, requireRole."

### What the client should remember
- "The system isn't just functional — it's defended on the software side too: security headers, strict CORS, rate limits, dependency auditing, and a CI pipeline that runs tests and the security audit on every change."
- "Before any real deployment, there's a security checklist that makes sure the dev-only settings (like local CORS origins) are updated for the real environment."

---

## Demo flow suggestion (one continuous session)

If you're showing all five risks in one sitting, this order reads cleanly:

1. **Login + roles** (Risk #1) — show that you can't see anything without logging in, and that an officer can't pretend to be admin.
2. **Create a report with AI help** (Risk #2) — show the safety gate, then a real draft, then the officer applying only what they agree with.
3. **Admin backups** (Risk #3) — show the backup page, do an on-demand backup, show Verify on a snapshot, and mention the flash-drive copy.
4. **Account security** (Risk #4) — show the force-change password flow, then the admin activity log / security banner.
5. **System security** (Risk #5) — finish by showing the GitHub Actions green run and the dependency audit doc, then the pre-release checklist.

That ends on the "we continuously watch the software itself" note, which is a natural wrap-up after the more concrete feature demos.

---

## Notes for the person presenting

- You don't need to recite every file path. The file paths are in `docs/fixes/risk-register-implementation-status.md` for the evaluators; in the live demo, focus on **what the client sees** and **what happens if the control were missing**.
- For Risk #3 and #4, if a live failure demo (lockout, restore) would disrupt the system, narrate it from the activity log instead — the log already has the evidence.
- For Risk #5, the back-end-only audience will care about the dependency audit doc and the green CI run; the less technical audience will care more about "before we put this in front of real users, here's the checklist."
- If asked something this doc doesn't cover, the authoritative technical details are in `docs/fixes/risk-register-implementation-status.md` and the referenced service/route files.
