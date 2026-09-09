# BLUEWRITE Information Security and Acceptable Use Policy

## Purpose
This policy establishes mandatory security rules to protect BLUEWRITE's information resources — including police incident reports, officer account credentials, and system audit logs — from unauthorized access, disclosure, modification, and disruption. Because BLUEWRITE stores sensitive law-enforcement data, the policy also enforces the system's AI-authorship boundary, under which the AI assistant may assist only with designated narrative sections and never with officer-authored report sections.

> *Explanation:* Incident reports contain personally identifiable information about complainants, victims, suspects, and witnesses, as well as operational police details. A breach would expose private citizens to harm and compromise investigations, so the policy exists to keep access limited, authenticated, and audited.

## Scope
This policy applies to:
- **All users**: Police officers, administrators, and developers with access to BLUEWRITE systems
- **All environments**: Production, staging, development, and local machines
- **All systems**: React frontend, Express REST API, MySQL database (`bluewrite_db`), AI integrations (Google AI Studio / local Ollama), email verification service, and backup scripts
- **All data**: Incident reports and their structured fields, officer accounts and password hashes, session records, and activity logs

## Policy Statements

### 1. Authentication & Access Control
- **Strong passwords are required**: minimum 12 characters with letters, numbers, and special characters; common and username-derived passwords are rejected.
  > *Explanation:* Longer, complex passwords take far longer to crack. The system enforces this at the server (`password.js`) with a blocklist of common passwords, so a weak choice is rejected at registration or password change, not just discouraged.
- **Passwords are hashed with bcrypt (cost 12)** and never stored or logged in plain text.
  > *Explanation:* Hashing means even if the database were stolen, attackers would only get irreversible hashes. Cost 12 makes each guess computationally expensive, slowing offline cracking attempts.
- **New or reset accounts must change their temporary password** and complete any required security review before accessing protected resources.
  > *Explanation:* Temporary passwords distributed by admins could be known to people other than the assigned officer. Forcing a change on first use ensures only the real officer ever knows the working credential.
- **Access is role-based**: officers and administrators may only perform actions permitted to their role, and unauthorized access attempts are logged.
  > *Explanation:* Role-based middleware (`requireRole`) checks the user's role on every protected route. If someone tries to reach a resource above their privilege level, the request is denied and recorded as an `UNAUTHORIZED_ACCESS_ATTEMPT` in the activity log.
- **Sessions are server-side and protected**: cookies are HttpOnly, SameSite=Strict, and Secure in production; sessions expire after 8 hours, with a stricter idle timeout for administrators.
  > *Explanation:* HttpOnly cookies block JavaScript from stealing the session token (mitigating XSS), and SameSite=Strict blocks cross-site request forgery. The shorter admin idle timeout limits the damage of an unattended administrator workstation.
- **Login abuse is throttled**: failed login attempts trigger account lockout, progressive delays, and per-IP/per-username rate limits.
  > *Explanation:* Without limits, an attacker could try millions of passwords. Lockout and rate limiting make brute-force attempts slow, noisy, and logged (`LOGIN_THROTTLED`, `ACCOUNT_LOCKED`).

### 2. Data Protection
- **All report and personal data stays within the system**: report data must not be copied to personal devices, messaging apps, or unauthorized storage.
  > *Explanation:* Data is only protected while it stays inside the controlled environment — database, application, and encrypted backups. Copies on personal phones or chats fall outside every safeguard in this policy.
- **Secrets (database credentials, session secret, AI keys, SMTP credentials) live only in environment files** that are excluded from version control.
  > *Explanation:* Hardcoded secrets become permanently visible in Git history to anyone with repository access. `.env` files are git-ignored, keeping credentials out of source code and commits.
- **Cross-origin access is restricted** to an explicit allowlist of trusted frontend origins.
  > *Explanation:* The API rejects requests from unknown origins, so a malicious website cannot silently submit authenticated requests against the backend from a victim's browser.
- **Database backups are gzip-compressed, GPG-encrypted, and use a least-privilege backup account**; unencrypted backup files must not be retained.
  > *Explanation:* A backup contains everything in the database — an unencrypted backup is a full copy of all sensitive data sitting in a folder. Encryption means a stolen backup file is useless without the key, and the dedicated backup account can dump data but cannot modify or delete it.

### 3. AI Usage Boundary
- **The AI assistant may draft only the designated narrative section (§III)**; officer- and admin-authored sections (§I, §II, §IV, §V, §VI) must never be generated or altered by AI.
  > *Explanation:* Some parts of a police report are legal attestations of fact by a sworn officer. If an AI wrote them, accountability for the content would be unclear. The allowlist in `aiService.js` (`REPORT_DRAFT_FIELDS`) enforces this boundary at the code level, and tests assert it holds.
- **AI-generated drafts must pass fact validation before becoming review-ready**; failed validations are logged and the draft is blocked from review.
  > *Explanation:* Language models can invent details ("hallucinate"). Fact validation cross-checks the AI draft against the officer's actual entered data, so fabricated names, dates, or locations cannot silently enter a report (`AI_FACT_VALIDATION_FAILED` is logged when blocked).
- **AI requests are rate-limited and raw provider responses are never exposed to users.**
  > *Explanation:* Rate limiting protects the AI quota from abuse and controls cost. Hiding raw provider errors prevents leaking infrastructure details or API information to end users.

### 4. Secure Development & Operations
- **All database changes must go through versioned migration scripts**; direct ad-hoc schema changes to shared or production databases are prohibited.
  > *Explanation:* Migrations are reviewable, repeatable, and reversible. Ad-hoc changes leave no record of what changed, drift between environments, and can silently break data integrity.
- **User-facing errors must be generic; detailed errors are logged server-side only.**
  > *Explanation:* A message like "MySQL syntax error in reports table" tells an attacker how the system is built. Users see a simple "Something went wrong," while full details go to server logs where developers can debug safely.
- **Every security-relevant event is written to the activity log** — logins, logouts, throttled attempts, lockouts, account creation, unauthorized access attempts, and AI validation failures — with actor, target, and IP address.
  > *Explanation:* Logs are the system's memory. After an incident, they answer who did what, when, and from where. Without them, misuse is undetectable and unprovable.
- **Security tests must pass before changes are merged**, including authentication security and AI safety suites.
  > *Explanation:* The test suites (`authSecurity`, `aiSafety`, `reportFlow`, `reportDetailFields`) act as automated guards — they catch regressions like a route missing role checks or an AI boundary violation before the code reaches production.

### 5. Incident Reporting & Recovery
- **Suspected security incidents (unauthorized access, credential compromise, data exposure) must be reported to the system administrator immediately.**
  > *Explanation:* Speed matters more than perfection in incident response. Every hour of delay lets an attacker do more damage; immediate reporting activates lockout, session revocation, and log review right away.
- **Compromised accounts must be disabled, sessions revoked, and passwords reset before reactivation.**
  > *Explanation:* Re-enabling an account without revoking its existing sessions leaves the attacker logged in even after the password is changed. Revocation and reset must happen together.
- **Backups are retained per the 7-day rotation and restore procedures must be tested before being relied upon.**
  > *Explanation:* A backup that has never been restored is only a hope, not a recovery plan. Regular restore testing proves the system can actually recover from data loss or ransomware.

## Responsibilities

| Role | Responsibilities |
|------|------------------|
| **System Administrator / Security Owner** | Enforce this policy; manage accounts and roles; review activity logs; coordinate incident response; quarterly policy review |
| **Officers (Users)** | Keep credentials confidential; never share accounts; complete required password changes and security reviews; report incidents immediately; enter accurate report data |
| **Developers** | Follow secure coding practices; keep secrets out of code; write and maintain security tests; use migrations for all schema changes; validate input server-side |
| **All Personnel** | Use only authorized access; protect report data; lock unattended sessions |

## Enforcement

Violations of this policy may result in:

- **Immediate account suspension or access revocation** (system accounts, sessions)
- **Account lockout** — automatic for repeated failed logins; administrator-imposed for misuse
- **Disciplinary action** per police organizational policy and applicable rules
- **Legal consequences** for unauthorized access, data disclosure, or falsification of official records
- **Mandatory re-training** and supervised access period for repeat violations

---

**Effective Date:** September 9, 2026
**Next Review:** December 9, 2026
**Owner:** System Administrator
**Classification:** Internal — Confidential
