# BLUEWRITE — Database Backup & Recovery Runbook

Remediation for **Risk #3 — Database / Data Loss / No Regular Backup** (Risk Score 15, Critical) from `docs/fixes/risk-register-implementation-status.md`.

Implemented: September 6, 2026. All instructions below reflect the **actual** implementation in this repository — Windows + MySQL Server 8.4 (service `MySQL84`), Git Bash for scripts, Task Scheduler for scheduling.

---

## 1. What exists now

| Component | Path | Purpose |
|---|---|---|
| Backup script | `backend/scripts/backup.sh` | Consistent `mysqldump --single-transaction` snapshot, gzipped, optional GPG encryption, 7-day retention pruning |
| Restore script | `backend/scripts/restore.sh` | Decrypts/decompresses a backup and loads it into a target DB (refuses the live DB name) |
| Backup user SQL | `backend/scripts/create-backup-user.sql` | Least-privilege `bluewrite_backup@localhost` (SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, PROCESS — no writes) |
| Backup config | `backend/scripts/backup.env` | Real credentials + retention + GPG key (**gitignored**) |
| Config template | `backend/scripts/backup.env.example` | Committed template |
| Output directory | `backend/backups/` | Timestamped dumps `bluewrite-YYYY-MM-DD_HHMMSS.sql.gz` (**gitignored**) |

npm conveniences (run from `backend/`):

```bash
npm run backup                                   # create a backup now
npm run restore -- backups/<file>.sql.gz bluewrite_restore_test   # restore test
```

## 2. Backup user (created September 6, 2026)

- Account: `bluewrite_backup@localhost`, random 28-char password stored only in `backend/scripts/backup.env`.
- Grants verified: `SELECT, PROCESS, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER` on `*.*` — read-only.
- To re-create from scratch (as root): `mysql -u root -p < backend/scripts/create-backup-user.sql`, then set the password to match `backup.env`:
  `ALTER USER 'bluewrite_backup'@'localhost' IDENTIFIED BY '<password-from-backup.env>';`

## 3. Encryption (GPG) — key generation pending

The script supports GPG encryption: when `GPG_KEY` is set in `backup.env`, every dump is encrypted to that public key and the plaintext `.sql.gz` is shredded. The private key must never live on the database machine.

To finish this step (run on the machine that will hold the private key, e.g. the admin's own laptop):

```bash
# 1. Generate the pair (on the admin machine)
gpg --quick-generate-key "BLUEWRITE Backups <backups@bluewrite.local>" rsa3072 encr 0

# 2. Get the key id
gpg --list-keys --keyid-format long

# 3. Export the PUBLIC key and copy it to the server
gpg --armor --export <KEY_ID> > bluewrite-backup-public.asc

# 4. On the server: import it and record the key id in backend/scripts/backup.env
gpg --import bluewrite-backup-public.asc
#   GPG_KEY=<KEY_ID or email>
```

Until then backups are unencrypted `.sql.gz` files — acceptable short-term on this single-machine dev setup, but encryption should be enabled before any real deployment.

## 4. Scheduling (Windows Task Scheduler) — command ready to install

Run **once** in an elevated Command Prompt/PowerShell to schedule daily 02:00 backups:

```bat
schtasks /Create /TN "BLUEWRITE Database Backup" /SC DAILY /ST 02:00 /TR "\"C:\Program Files\Git\bin\bash.exe\" -lc \"cd /c/Users/Shaine\ Jayme/<repo-path>/backend && npm run backup\"" /F
```

(Replace `<repo-path>` with the real path; `/F` overwrites an existing task of the same name.)

Verify / manage:

```bat
schtasks /Query /TN "BLUEWRITE Database Backup" /V
schtasks /Run /TN "BLUEWRITE Database Backup"     # test fire
schtasks /Delete /TN "BLUEWRITE Database Backup"  # remove
```

Not installed automatically — the deployment host choice is yours; on a Linux server the equivalent is `0 2 * * * cd /srv/bluewrite/backend && npm run backup` in crontab.

## 5. Restore procedure

```bash
cd backend
# 1. Create an empty sandbox (restore.sh refuses to overwrite the live DB name)
mysql -u root -p -e "CREATE DATABASE bluewrite_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 2. Restore (auto-handles .sql.gz and .sql.gz.gpg)
npm run restore -- backups/<backup-file> bluewrite_restore_test
# 3. Compare row counts against live (see §6), then drop the sandbox
mysql -u root -p -e "DROP DATABASE bluewrite_restore_test;"
```

**Full disaster recovery** (real data loss): create/verify a fresh `bluewrite_db`, then run the restore with `bluewrite_db` as the explicit target — the live-name guard is bypassed only by that explicit second argument.

## 6. Restore test log

| Date | Run by | Backup file | Result | Notes |
|---|---|---|---|---|
| 2026-09-06 | Buffy (AI) | `backups/bluewrite-2026-09-06_205650.sql.gz` (12,514 B) | **PASS** | Restored into `bluewrite_restore_test`. Row counts matched live exactly: users 3=3, officers 2=2, reports 11=11, report_people 15=15, activity_logs 297=297, auth_sessions 1=1. gzip integrity OK. |

**Quarterly cadence:** re-run §5 every quarter (next due ~2026-12-06) and add a row here. A backup is only a control if restores are proven.

## 7. Off-site copies (recommended next step)

Keep at least one copy off the database host. Simplest on Windows: a scheduled `robocopy` to an external drive or cloud-synced folder:

```bat
robocopy "<repo>\backend\backups" "D:\BluewriteBackupOffsite" bluewrite-*.sql.gz /MOV 3 /R:2 /W:5
```

(or sync `backend/backups/` to OneDrive/Google Drive — both encrypt in transit; enable GPG per §3 so files are also encrypted at rest).
