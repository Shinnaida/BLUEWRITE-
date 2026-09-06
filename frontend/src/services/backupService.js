// BLUEWRITE — Backup Service
// Admin-only database backup API methods.

import api from './api';

/** List available database backups (newest first). */
export async function getBackups() {
  return api.get('/backups');
}

/** Run a database backup now (same script as the scheduled 02:00 task). */
export async function runBackup() {
  return api.post('/backups');
}

/** Download a single backup file as a Blob (admin-only, audit-logged server-side). */
export async function downloadBackup(name) {
  return api.get(`/backups/${encodeURIComponent(name)}/download`, {
    responseType: 'blob',
    timeout: 120000,
  });
}

/** List currently attached removable (flash) drives. */
export async function getRemovableDrives() {
  return api.get('/backups/removable');
}

/** Run a fresh encrypted backup and copy it to a removable drive, e.g. "E:". */
export async function copyBackupToDrive(drive) {
  return api.post('/backups/removable/copy', { drive });
}

/** Verify a backup by restoring it into a sandbox DB and comparing row counts (non-destructive). */
export async function verifyBackup(name) {
  return api.post(`/backups/${encodeURIComponent(name)}/verify`);
}

/** Restore a backup OVER the live database. Requires confirm: "RESTORE". */
export async function restoreBackup(name, confirm) {
  return api.post(`/backups/${encodeURIComponent(name)}/restore`, { confirm });
}
