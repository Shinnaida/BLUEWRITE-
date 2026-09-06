// BLUEWRITE — Admin Backup Service
// Lets an administrator trigger a database backup on demand and inspect the
// backup directory. Delegates the real work to scripts/backup.sh (the same
// script the 2:00 AM scheduled task runs), so one code path does the dumping,
// gzip, GPG encryption, and retention pruning.

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { logActivity } = require('./logService');

const BACKEND_DIR = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.join(BACKEND_DIR, 'backups');
const BACKUP_SCRIPT = path.join(BACKEND_DIR, 'scripts', 'backup.sh');
const BASH_BIN = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : '/usr/bin/env';

let running = false; // one backup at a time — mysqldump is not free

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => /^bluewrite-\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz(\.gpg)?$/.test(name))
    .map((name) => {
      const full = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(full);
      return {
        name,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        encrypted: name.endsWith('.gpg'),
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first
}

function runBackupNow() {
  return new Promise((resolve) => {
    if (running) return resolve({ ok: false, message: 'A backup is already running. Try again in a moment.' });
    running = true;
    const started = Date.now();
    // bash -lc: login shell so npm/node/git paths resolve identically to manual runs.
    execFile(BASH_BIN, ['-lc', `"${BACKUP_SCRIPT.replace(/\\/g, '/')}"`], { timeout: 10 * 60 * 1000 }, (error, stdout, stderr) => {
      running = false;
      const durationMs = Date.now() - started;
      const output = `${stdout || ''}${stderr || ''}`.trim();
      if (error) {
        return resolve({ ok: false, message: 'Backup failed — check the server logs and backups/schedule.log.', detail: output.slice(-800) });
      }
      const backups = listBackups();
      const newest = backups[0];
      resolve({ ok: true, durationMs, backup: newest, backups, output: output.slice(-800) });
    });
  });
}

async function runBackupAndLog(actor) {
  const result = await runBackupNow();
  if (result.ok && result.backup) {
    await logActivity({
      actorUserId: actor.userId,
      action: 'DATABASE_BACKUP_CREATED',
      targetType: 'System',
      targetId: result.backup.name,
      description: `Administrator ran an on-demand database backup (${result.backup.name}${result.backup.encrypted ? ', GPG-encrypted' : ''}) in ${Math.round(result.durationMs / 100) / 10}s.`,
      metadata: { backupFile: result.backup.name, encrypted: result.backup.encrypted, sizeBytes: result.backup.sizeBytes, durationMs: result.durationMs, trigger: 'admin_ui' },
    }).catch(() => {});
  } else if (result.ok === false) {
    await logActivity({
      actorUserId: actor.userId,
      action: 'DATABASE_BACKUP_FAILED',
      targetType: 'System',
      targetId: 'database-backup',
      description: 'An on-demand database backup triggered from the admin UI failed.',
      metadata: { trigger: 'admin_ui' },
    }).catch(() => {});
  }
  return result;
}

// Strict filename whitelist — same pattern listBackups() accepts. Anything
// else (paths, traversal like ../, dotfiles, stray extensions) is rejected
// before the filesystem is ever touched.
const BACKUP_NAME_RE = /^bluewrite-\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz(\.gpg)?$/;

/**
 * Resolve a requested backup file name to an absolute path, safely.
 * Returns null for anything that is not a plain, existing backup filename.
 */
function getBackupFilePath(name) {
  if (typeof name !== 'string' || !BACKUP_NAME_RE.test(name)) return null;
  // Belt-and-braces: even a whitelisted name must live exactly in BACKUP_DIR
  // and the file must exist. path.basename() strips any directory component.
  const resolved = path.join(BACKUP_DIR, path.basename(name));
  if (path.dirname(resolved) !== BACKUP_DIR) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

// ----------------------------------------------------------------------------
// Removable-drive (flash drive) support
// ----------------------------------------------------------------------------

let drivesScanning = false; // PowerShell detection is serialized; the UI polls GET /removable

/**
 * Detect removable drives (Windows: DriveType 2 = removable). Returns drives as
 * { drive, volumeName, freeBytes, totalBytes }. Non-Windows returns [] (feature
 * is Windows-only by design — matches this deployment).
 */
function listRemovableDrives() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([]);
    if (drivesScanning) return resolve({ scanning: true, drives: [] });
    drivesScanning = true;
    const ps = 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" | Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress';
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 15000, windowsHide: true }, (error, stdout) => {
      drivesScanning = false;
      if (error) return resolve({ scanning: false, drives: [] });
      let parsed;
      try {
        parsed = JSON.parse(stdout || 'null');
      } catch {
        return resolve({ scanning: false, drives: [] });
      }
      // ConvertTo-Json returns an object (not array) when there is exactly one match.
      const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      const drives = items
        .map((d) => ({
          drive: String(d.DeviceID || '').replace(/\\$/, ''), // "E:" not "E:\"
          volumeName: String(d.VolumeName || ' Removable drive').trim() || ' Removable drive',
          totalBytes: Number(d.Size) || 0,
          freeBytes: Number(d.FreeSpace) || 0,
        }))
        .filter((d) => /^[A-Z]:$/.test(d.drive));
      return resolve({ scanning: false, drives });
    });
  });
}

/**
 * Run a fresh backup, then copy the resulting encrypted file onto a removable
 * drive. The copy is encrypted-only: if the newest backup is somehow a plain
 * .sql.gz, it refuses rather than write unencrypted data to a portable device.
 */
async function runBackupAndCopyToDrive(actor, drive) {
  // Validate the drive letter against a live re-scan — never trust the client.
  const detection = await listRemovableDrives();
  const valid = detection.drives.find((d) => d.drive === drive);
  if (!valid) {
    return { ok: false, code: 'DRIVE_NOT_FOUND', message: `Drive ${drive} is not a currently attached removable drive.` };
  }
  if (valid.freeBytes > 0 && valid.freeBytes < 50 * 1024 * 1024) {
    return { ok: false, code: 'DRIVE_FULL', message: `Drive ${drive} has less than 50 MB free — free up space and try again.` };
  }

  const result = await runBackupNow();
  if (!result.ok || !result.backup) {
    return { ok: false, code: 'BACKUP_FAILED', message: result.message || 'Backup failed before copying to the flash drive.' };
  }

  const source = getBackupFilePath(result.backup.name);
  if (!source) {
    return { ok: false, code: 'BACKUP_FAILED', message: 'Backup completed but the output file could not be located.' };
  }
  if (!result.backup.encrypted) {
    return { ok: false, code: 'NOT_ENCRYPTED', message: 'Refusing to copy: the newest backup is not GPG-encrypted.' };
  }

  const targetDir = path.join(valid.drive, path.sep, 'BluewriteBackups');
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const target = path.join(targetDir, result.backup.name);
    // Copy fresh: refuse to silently overwrite a different file with the same name.
    fs.copyFileSync(source, target);
    const copiedBytes = fs.statSync(target).size;
    if (copiedBytes !== result.backup.sizeBytes) {
      return { ok: false, code: 'COPY_FAILED', message: `Copy size mismatch — expected ${result.backup.sizeBytes} bytes, got ${copiedBytes}.` };
    }
    return {
      ok: true,
      backup: result.backup,
      copy: { drive: valid.drive, volumeName: valid.volumeName, targetPath: target, sizeBytes: copiedBytes, durationMs: result.durationMs },
      backups: result.backups,
    };
  } catch (copyError) {
    return { ok: false, code: 'COPY_FAILED', message: `Could not write to ${drive} — is it writable and still attached? (${copyError.code || copyError.message})` };
  }
}

async function runBackupAndCopyToDriveAndLog(actor, drive) {
  const result = await runBackupAndCopyToDrive(actor, drive);
  if (result.ok) {
    await logActivity({
      actorUserId: actor.userId,
      action: 'DATABASE_BACKUP_COPIED_TO_REMOVABLE',
      targetType: 'System',
      targetId: result.backup.name,
      description: `Administrator copied an encrypted database backup to removable drive ${result.copy.drive} (${result.copy.volumeName}) — ${result.backup.name}.`,
      metadata: { backupFile: result.backup.name, drive: result.copy.drive, volumeName: result.copy.volumeName, sizeBytes: result.copy.sizeBytes, encrypted: true, trigger: 'admin_ui' },
    }).catch(() => {});
  } else if (result.code !== 'DRIVE_NOT_FOUND') {
    // DRIVE_NOT_FOUND happens on stale UI state; anything else is worth a log line.
    await logActivity({
      actorUserId: actor.userId,
      action: 'DATABASE_BACKUP_FAILED',
      targetType: 'System',
      targetId: 'removable-drive-copy',
      description: `On-demand backup-to-flash-drive failed (${result.code}).`,
      metadata: { code: result.code, drive, trigger: 'admin_ui' },
    }).catch(() => {});
  }
  return result;
}

// ----------------------------------------------------------------------------
// Restore / verify support
// ----------------------------------------------------------------------------

const RESTORE_SCRIPT = path.join(BACKEND_DIR, 'scripts', 'restore.sh');
const MYSQL_BIN = process.env.MYSQL_BIN || 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe';
const SANDBOX_DB = 'bluewrite_restore_test';
const RESTORE_DB_RE = /^[a-zA-Z0-9_]{1,64}$/;
const CORE_TABLES = ['users', 'officers', 'reports', 'report_people', 'activity_logs', 'auth_sessions'];

/** Run one mysql CLI command with the password supplied via env (never on the argv). */
function runMysql(args, password) {
  return new Promise((resolve) => {
    execFile(MYSQL_BIN, args, { timeout: 120000, env: { ...process.env, MYSQL_PWD: password } }, (error, stdout, stderr) => {
      if (error) return resolve({ ok: false, output: `${stdout || ''}${stderr || ''}`.trim().slice(-500) });
      return resolve({ ok: true, output: (stdout || '').trim() });
    });
  });
}

/** Restore credentials come from scripts/backup.env — the same place restore.sh reads them. */
function readRestoreCreds() {
  const creds = {};
  const envFile = path.join(BACKEND_DIR, 'scripts', 'backup.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(RESTORE_DB_USER|RESTORE_DB_PASSWORD|GPG_PASSPHRASE|DB_NAME)=(.*)$/);
      if (m) creds[m[1]] = m[2].trim().replace(/^"|"$/g, '');
    }
  }
  if (!creds.RESTORE_DB_USER || !creds.RESTORE_DB_PASSWORD) return null;
  return creds;
}

/** Row counts for the core tables; null means the table does not exist in that DB. */
async function countRows(database, creds) {
  const counts = {};
  for (const table of CORE_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runMysql(['-h', process.env.DB_HOST || 'localhost', '-P', String(process.env.DB_PORT || 3306), '-u', creds.RESTORE_DB_USER, '-N', '-e', `SELECT COUNT(*) FROM \`${database}\`.\`${table}\``], creds.RESTORE_DB_PASSWORD);
    counts[table] = r.ok ? (Number(r.output.split('\n').pop()) || 0) : null;
  }
  return counts;
}

/**
 * Replay a backup file into a target database using the same pipeline as
 * scripts/restore.sh (gpg → gzip → mysql). The password travels via env.
 */
function restoreInto(targetDb, backupFilePath, creds) {
  return new Promise((resolve) => {
    const src = backupFilePath.replace(/\\/g, '/');
    const encrypted = src.endsWith('.gpg');
    // When GPG_PASSPHRASE is configured we decrypt non-interactively; otherwise
    // gpg pops its own pinentry dialog on the server session.
    const gpgOpts = creds.GPG_PASSPHRASE ? '--batch --yes --pinentry-mode loopback --passphrase "$GPG_PASSPHRASE"' : '';
    const decryptCmd = encrypted ? `gpg ${gpgOpts} --decrypt "${src}"` : `cat "${src}"`;
    const script = [
      'set -o pipefail',
      `cd "${BACKEND_DIR.replace(/\\/g, '/')}"`,
      `if [ -f scripts/backup.env ]; then set -a; source scripts/backup.env; set +a; fi`,
      `${decryptCmd} | gzip -dc | "$MYSQL_BIN" -h "${process.env.DB_HOST || 'localhost'}" -P "${process.env.DB_PORT || 3306}" -u "${creds.RESTORE_DB_USER}" "${targetDb}"`,
    ].join('\n');
    execFile(BASH_BIN, ['-lc', script], { timeout: 10 * 60 * 1000, env: { ...process.env, MYSQL_PWD: creds.RESTORE_DB_PASSWORD, MYSQL_BIN } }, (error, stdout, stderr) => {
      const output = `${stdout || ''}${stderr || ''}`.trim();
      if (error) return resolve({ ok: false, message: 'Restore pipeline failed — is the GPG passphrase correct and the file readable?', detail: output.slice(-600) });
      return resolve({ ok: true });
    });
  });
}

/**
 * Verify a backup end-to-end: restore it into a throwaway sandbox database,
 * count the core tables, compare with live, then drop the sandbox.
 * Completely non-destructive — the live database is never touched.
 */
async function verifyBackupAndLog(actor, backupName) {
  const creds = readRestoreCreds();
  if (!creds) return { ok: false, code: 'NO_CREDS', message: 'Restore credentials (RESTORE_DB_USER / RESTORE_DB_PASSWORD) are missing from scripts/backup.env.' };

  const filePath = getBackupFilePath(backupName);
  if (!filePath) return { ok: false, code: 'NOT_FOUND', message: 'Backup file not found.' };

  const liveDb = creds.DB_NAME || process.env.DB_NAME || 'bluewrite_db';
  const mysql = (args) => runMysql(['-h', process.env.DB_HOST || 'localhost', '-P', String(process.env.DB_PORT || 3306), '-u', creds.RESTORE_DB_USER, ...args], creds.RESTORE_DB_PASSWORD);

  // Fresh sandbox every time
  const dropped = await mysql(['-e', `DROP DATABASE IF EXISTS \`${SANDBOX_DB}\`; CREATE DATABASE \`${SANDBOX_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`]);
  if (!dropped.ok) return { ok: false, code: 'SANDBOX_FAILED', message: `Could not create the sandbox database: ${dropped.output}` };

  const restored = await restoreInto(SANDBOX_DB, filePath, creds);
  if (!restored.ok) {
    await mysql(['-e', `DROP DATABASE IF EXISTS \`${SANDBOX_DB}\`;`]);
    return { ok: false, code: 'RESTORE_FAILED', ...restored };
  }

  const sandboxCounts = await countRows(SANDBOX_DB, creds);
  const liveCounts = await countRows(liveDb, creds);
  await mysql(['-e', `DROP DATABASE IF EXISTS \`${SANDBOX_DB}\`;`]); // always clean up

  const result = {
    ok: true,
    backup: backupName,
    sandboxCounts,
    liveCounts,
    match: Object.keys(sandboxCounts).every((t) => sandboxCounts[t] === null || liveCounts[t] === null || sandboxCounts[t] === liveCounts[t]),
  };
  await logActivity({
    actorUserId: actor.userId,
    action: 'BACKUP_RESTORE_VERIFIED',
    targetType: 'System',
    targetId: backupName,
    description: `Administrator verified backup ${backupName} by restoring it into the ${SANDBOX_DB} sandbox (row counts ${result.match ? 'match' : 'DIFFER from'} live).`,
    metadata: { backupFile: backupName, sandboxCounts, liveCounts, match: result.match },
  }).catch(() => {});
  return result;
}

/**
 * Restore a backup OVER the live database. Requires the exact confirmation
 * phrase 'RESTORE' — a deliberate speed bump against one-click catastrophe.
 */
async function restoreToLiveAndLog(actor, backupName, confirmPhrase) {
  if (String(confirmPhrase || '').trim() !== 'RESTORE') {
    return { ok: false, code: 'CONFIRMATION_REQUIRED', message: 'Type RESTORE exactly to confirm overwriting the live database.' };
  }
  const creds = readRestoreCreds();
  if (!creds) return { ok: false, code: 'NO_CREDS', message: 'Restore credentials are missing from scripts/backup.env.' };

  const filePath = getBackupFilePath(backupName);
  if (!filePath) return { ok: false, code: 'NOT_FOUND', message: 'Backup file not found.' };

  const liveDb = creds.DB_NAME || process.env.DB_NAME || 'bluewrite_db';
  const restored = await restoreInto(liveDb, filePath, creds);
  await logActivity({
    actorUserId: actor.userId,
    action: restored.ok ? 'DATABASE_RESTORED_TO_LIVE' : 'DATABASE_RESTORE_FAILED',
    targetType: 'System',
    targetId: backupName,
    description: restored.ok
      ? `Administrator restored backup ${backupName} OVER the live database (${liveDb}).`
      : `A live-database restore of ${backupName} failed.`,
    metadata: { backupFile: backupName, targetDb: liveDb, success: restored.ok },
  }).catch(() => {});
  if (!restored.ok) return { ok: false, code: 'RESTORE_FAILED', ...restored };
  const counts = await countRows(liveDb, creds);
  return { ok: true, backup: backupName, targetDb: liveDb, counts };
}

module.exports = { listBackups, runBackupAndLog, getBackupFilePath, listRemovableDrives, runBackupAndCopyToDriveAndLog, verifyBackupAndLog, restoreToLiveAndLog, BACKUP_DIR };
