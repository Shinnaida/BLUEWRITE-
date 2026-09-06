// BLUEWRITE — Admin backup routes (admin role only).
const express = require('express');
const path = require('node:path');
const { success, error } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../services/logService');
const backupService = require('../services/backupService');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/backups — list available backup files (newest first).
router.get('/', (req, res) => {
  try {
    return success(res, { backups: backupService.listBackups() });
  } catch {
    return error(res, 'Unable to list backups.', 500);
  }
});

// POST /api/backups — run a backup now (same script as the scheduled 02:00 task).
router.post('/', async (req, res) => {
  const result = await backupService.runBackupAndLog({ userId: req.user.id });
  if (!result.ok) return error(res, result.message, 409);
  return success(res, { backup: result.backup, backups: result.backups }, 'Database backup completed successfully.', 201);
});

// GET /api/backups/:name/download — securely stream one backup file to an admin.
// The service layer rejects anything that is not a whitelisted backup filename
// inside the backup directory, so traversal (e.g. ..%2f..%2f.env) cannot escape it.
router.get('/:name/download', async (req, res) => {
  const filePath = backupService.getBackupFilePath(req.params.name);
  if (!filePath) {
    await logActivity({
      actorUserId: req.user.id,
      action: 'BACKUP_DOWNLOAD_DENIED',
      targetType: 'System',
      targetId: String(req.params.name || '').slice(0, 200),
      description: 'A backup download request was rejected (unknown or invalid file name).',
      metadata: { requested: String(req.params.name || '').slice(0, 200) },
      ipAddress: req.ip,
    }).catch(() => {});
    return error(res, 'Backup file not found.', 404);
  }

  logActivity({
    actorUserId: req.user.id,
    action: 'BACKUP_DOWNLOADED',
    targetType: 'System',
    targetId: path.basename(filePath),
    description: 'Administrator downloaded a database backup file.',
    metadata: { backupFile: path.basename(filePath) },
    ipAddress: req.ip,
  }).catch(() => {});

  return res.download(filePath, path.basename(filePath));
});

// GET /api/backups/removable — list currently attached removable (flash) drives.
// NOTE: declared before /:name/download so "removable" is not eaten as a filename param.
router.get('/removable', async (req, res) => {
  try {
    const { drives, scanning } = await backupService.listRemovableDrives();
    return success(res, { drives, scanning });
  } catch {
    return error(res, 'Unable to scan for removable drives.', 500);
  }
});

// POST /api/backups/removable/copy — run a fresh encrypted backup and copy it to
// the given removable drive. Body: { drive: "E:" }
router.post('/removable/copy', async (req, res) => {
  const drive = String(req.body?.drive || '').toUpperCase().trim();
  if (!/^[A-Z]:$/.test(drive)) return error(res, 'A valid drive letter is required (e.g. "E:").', 400);
  const result = await backupService.runBackupAndCopyToDriveAndLog({ userId: req.user.id }, drive);
  if (!result.ok) {
    const status = result.code === 'DRIVE_NOT_FOUND' ? 404 : result.code === 'BACKUP_FAILED' ? 500 : 409;
    return error(res, result.message, status);
  }
  const message = `Backup ${result.backup.name} copied to ${result.copy.drive} (${result.copy.volumeName}).`;
  return success(res, { backup: result.backup, copy: result.copy, backups: result.backups }, message, 201);
});

// POST /api/backups/:name/verify — non-destructive restore test into a sandbox DB.
// Restores the backup into bluewrite_restore_test, counts core tables against live,
// then drops the sandbox. The live database is never touched.
router.post('/:name/verify', async (req, res) => {
  const result = await backupService.verifyBackupAndLog({ userId: req.user.id }, req.params.name);
  if (!result.ok) {
    const status = { NO_CREDS: 500, NOT_FOUND: 404, SANDBOX_FAILED: 500, RESTORE_FAILED: 500 }[result.code] || 500;
    return error(res, result.message, status);
  }
  const message = result.match
    ? `Verification passed — restored row counts match the live database.`
    : 'Verification completed — restored row counts differ from live (expected if new data was added since the backup).';
  return success(res, result, message);
});

// POST /api/backups/:name/restore — restore OVER the live database.
// Requires { confirm: "RESTORE" } in the body as a deliberate speed bump.
router.post('/:name/restore', async (req, res) => {
  const result = await backupService.restoreToLiveAndLog({ userId: req.user.id }, req.params.name, req.body?.confirm);
  if (!result.ok) {
    const status = result.code === 'CONFIRMATION_REQUIRED' ? 400 : result.code === 'NOT_FOUND' ? 404 : 500;
    return error(res, result.message, status);
  }
  return success(res, result, `Live database restored from ${result.backup}.`);
});

module.exports = router;
