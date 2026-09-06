// BLUEWRITE — Admin BackupsPage
// On-demand database backups plus visibility of the backup directory.
// The scheduled 02:00 daily backup (Windows Task Scheduler) writes to the same
// folder, so this page shows both scheduled and manual backups.

import React, { useEffect, useState } from 'react';
import { HardDriveDownload, DatabaseBackup, Lock, LockOpen, RefreshCw, ShieldAlert, FolderArchive, CalendarClock, FileClock, Download, Usb, HardDrive, ShieldCheck, Undo2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getBackups, runBackup, downloadBackup, getRemovableDrives, copyBackupToDrive, verifyBackup, restoreBackup } from '../../services/backupService';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [downloadingName, setDownloadingName] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [drives, setDrives] = useState([]);
  const [drivesLoading, setDrivesLoading] = useState(true);
  const [copyingDrive, setCopyingDrive] = useState('');
  const [verifyState, setVerifyState] = useState({ name: '', running: false, result: null, error: '' });
  const [restoreModal, setRestoreModal] = useState({ name: '', confirm: '', running: false, result: null, error: '' });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const r = await getBackups();
      setBackups(r.data.data.backups || []);
    } catch {
      setLoadError('Unable to load backups. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadDrives = async () => {
    setDrivesLoading(true);
    try {
      const r = await getRemovableDrives();
      setDrives(r.data.data.drives || []);
    } catch {
      setDrives([]);
    } finally {
      setDrivesLoading(false);
    }
  };

  useEffect(() => { loadDrives(); }, []);

  const backupNow = async () => {
    setRunning(true);
    try {
      const r = await runBackup();
      setBackups(r.data.data.backups || []);
      setToast({ message: `Backup created: ${r.data.data.backup?.name || 'completed'}`, type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Backup failed. Check the server logs.', type: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const download = async (name) => {
    setDownloadingName(name);
    try {
      const response = await downloadBackup(name);
      // Derive the save-as name from Content-Disposition when available.
      const header = response.headers?.['content-disposition'] || '';
      const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const fileName = match ? decodeURIComponent(match[1]) : name;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToast({ message: `Downloaded ${fileName}`, type: 'success' });
    } catch (e) {
      let message = e.response?.data?.message || `Could not download ${name}.`;
      // Blob error bodies arrive as a Blob — read them before showing the message.
      if (e.response?.data instanceof Blob && typeof e.response.data.text === 'function') {
        try {
          const parsed = JSON.parse(await e.response.data.text());
          if (parsed?.message) message = parsed.message;
        } catch { /* keep fallback message */ }
      }
      setToast({ message, type: 'error' });
    } finally {
      setDownloadingName('');
    }
  };

  const copyToDrive = async (drive) => {
    setCopyingDrive(drive);
    try {
      const r = await copyBackupToDrive(drive);
      setBackups(r.data.data.backups || []);
      const copy = r.data.data.copy;
      setToast({ message: `Backup ${copy ? copy.targetPath : 'copied'} to flash drive`, type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || `Could not back up to ${drive}.`, type: 'error' });
    } finally {
      setCopyingDrive('');
    }
  };

  const newest = backups[0];

  const runVerify = async (name) => {
    setVerifyState({ name, running: true, result: null, error: '' });
    try {
      const r = await verifyBackup(name);
      setVerifyState({ name: '', running: false, result: { ...r.data.data, name }, error: '' });
    } catch (e) {
      setVerifyState({ name: '', running: false, result: null, error: e.response?.data?.message || `Could not verify ${name}.` });
    }
  };

  const runRestoreLive = async () => {
    setRestoreModal((s) => ({ ...s, running: true, error: '' }));
    try {
      const r = await restoreBackup(restoreModal.name, restoreModal.confirm);
      setRestoreModal((s) => ({ ...s, running: false, result: r.data.data }));
      setToast({ message: `Live database restored from ${restoreModal.name}`, type: 'success' });
    } catch (e) {
      setRestoreModal((s) => ({ ...s, running: false, error: e.response?.data?.message || 'Restore failed.' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white shadow-md shadow-blue-700/25 sm:flex" aria-hidden="true">
            <DatabaseBackup size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Database Backups</h2>
            <p className="mt-0.5 text-sm text-slate-600">Create on-demand backups and review existing snapshots.</p>
          </div>
        </div>
        <Button
          onClick={backupNow}
          disabled={running}
          className="shadow-md shadow-blue-700/20 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-700/25 disabled:cursor-wait"
        >
          {running ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Backing up…
            </>
          ) : (
            <>
              <HardDriveDownload size={16} className="mr-2" />
              Back Up Now
            </>
          )}
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><FolderArchive size={14} aria-hidden="true" /> Snapshots on disk</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-950">{loading ? '…' : backups.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><FileClock size={14} aria-hidden="true" /> Latest backup</p>
          <p className="mt-2 truncate text-sm font-bold text-slate-900" title={newest?.name}>
            {newest ? `${newest.name}${newest.encrypted ? ' 🔒' : ''}` : (loading ? '…' : 'None yet')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><CalendarClock size={14} aria-hidden="true" /> Daily schedule</p>
          <p className="mt-2 text-sm font-bold text-slate-900">02:00 — automatic</p>
          <p className="text-xs text-slate-500">Windows Task Scheduler · 7-day retention</p>
        </div>
      </div>

      {/* Flash drive direct backup */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
              <Usb size={17} className="text-police-blue-700" aria-hidden="true" />
              Back Up Directly to Flash Drive
            </h3>
            <p className="mt-1 text-xs text-slate-500">Creates a fresh encrypted backup and copies it straight to the attached drive — one click for off-site copies.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadDrives} className="text-slate-500 hover:text-slate-900">
            <RefreshCw size={14} className="mr-1.5" />
            Re-scan
          </Button>
        </div>

        {drivesLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Scanning for removable drives…</p>
        ) : drives.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
              <Usb size={22} className="text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">No flash drive detected</p>
            <p className="mt-1 text-sm text-slate-500">Plug in a USB drive, then click “Re-scan”.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {drives.map((drive) => {
              const freeLabel = drive.totalBytes > 0 ? `${formatBytes(drive.freeBytes)} free of ${formatBytes(drive.totalBytes)}` : 'Capacity unknown';
              const isCopying = copyingDrive === drive.drive;
              return (
                <li key={drive.drive} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-police-blue-50 text-police-blue-700 ring-1 ring-inset ring-police-blue-100" aria-hidden="true">
                      <HardDrive size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {drive.drive} <span className="font-normal text-slate-500">· {drive.volumeName}</span>
                      </p>
                      <p className="text-xs text-slate-500">{freeLabel}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => copyToDrive(drive.drive)} disabled={isCopying || running}>
                    {isCopying ? (
                      <>
                        <RefreshCw size={14} className="mr-1.5 animate-spin" />
                        Backing up & copying…
                      </>
                    ) : (
                      <>
                        <Usb size={14} className="mr-1.5" />
                        Back Up to {drive.drive}
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          <Lock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Only GPG-encrypted backups are ever copied to removable media — never plaintext dumps. Every copy is recorded in the activity log.
        </p>
        <p className="mt-1 text-right text-[11px] text-slate-400">Writes to <code className="font-mono">&lt;drive&gt;\BluewriteBackups\</code></p>
      </div>

      {/* Backup list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
            <FolderArchive size={17} className="text-police-blue-700" aria-hidden="true" />
            Backup Files
          </h3>
          <Button variant="ghost" size="sm" onClick={load} className="text-slate-500 hover:text-slate-900">
            <RefreshCw size={14} className="mr-1.5" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading backups..." />
        ) : loadError ? (
          <div className="py-12 text-center">
            <ShieldAlert size={36} className="mx-auto text-red-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-red-700">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={load}>
              <RefreshCw size={14} className="mr-1.5" />
              Retry
            </Button>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
              <DatabaseBackup size={22} className="text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">No backups yet</p>
            <p className="mt-1 text-sm text-slate-500">Click “Back Up Now” to create the first snapshot.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {backups.map((backup, index) => (
              <li key={backup.name} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-1">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${backup.encrypted ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`} aria-hidden="true">
                    {backup.encrypted ? <Lock size={16} /> : <LockOpen size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-bold text-slate-900">{backup.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(backup.createdAt).toLocaleString()} · {formatBytes(backup.sizeBytes)}
                      {index === 0 && <span className="ml-1.5 font-bold text-police-blue-700">· latest</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={backup.encrypted ? 'active' : 'disabled'}>
                    {backup.encrypted ? 'Encrypted' : 'Unencrypted'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runVerify(backup.name)}
                    disabled={verifyState.running}
                    className="text-slate-500 hover:text-green-700"
                    title={`Test-restore ${backup.name} in a sandbox and compare row counts`}
                  >
                    {verifyState.running && verifyState.name === backup.name ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <ShieldCheck size={14} className="mr-1.5" />}
                    Verify
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRestoreModal({ name: backup.name, confirm: '', running: false, result: null, error: '' })}
                    disabled={verifyState.running || restoreModal.running}
                    className="text-slate-500 hover:text-red-700"
                    title={`Overwrite the live database with ${backup.name}`}
                  >
                    <Undo2 size={14} className="mr-1.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => download(backup.name)}
                    disabled={downloadingName === backup.name}
                    className="text-slate-500 hover:text-police-blue-700"
                    title={`Download ${backup.name}`}
                  >
                    {downloadingName === backup.name ? (
                      <RefreshCw size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <Download size={14} className="mr-1.5" />
                    )}
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Backups are stored on the server at <code className="mx-1 font-mono">backend/backups/</code> and pruned after 7 days. Copy the newest file off-site regularly — see the backup &amp; recovery runbook. Restores are performed by an administrator from the server (never through the browser).
        </p>
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {/* Verify result modal */}
      <Modal
        isOpen={!!verifyState.result}
        onClose={() => setVerifyState({ name: '', running: false, result: null, error: '' })}
        title="Backup Verification Result"
      >
        {verifyState.result && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-semibold ${verifyState.result.match ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
              <ShieldCheck size={18} />
              {verifyState.result.match
                ? 'Passed — this backup restores cleanly and matches the live data.'
                : 'Restorable, but row counts differ from live (expected if data changed after the backup was taken).'}
            </div>
            <p className="text-xs text-slate-500">Backup: <code className="font-mono">{verifyState.result.name}</code></p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1.5">Table</th>
                  <th className="py-1.5 text-right">In backup</th>
                  <th className="py-1.5 text-right">Live</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(verifyState.result.sandboxCounts).map(([table, count]) => (
                  <tr key={table} className="border-b border-slate-100">
                    <td className="py-1.5 font-medium text-slate-800">{table}</td>
                    <td className="py-1.5 text-right tabular-nums">{count ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500">{verifyState.result.liveCounts[table] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500">The sandbox database used for this test was dropped afterwards — live data was never touched.</p>
          </div>
        )}
      </Modal>

      {/* Restore-to-live modal */}
      <Modal
        isOpen={!!restoreModal.name && !restoreModal.result}
        onClose={() => setRestoreModal({ name: '', confirm: '', running: false, result: null, error: '' })}
        title="Restore to Live Database"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>
              This will <strong>overwrite everything</strong> in the live database with the contents of{' '}<code className="font-mono">{restoreModal.name}</code>. Any reports,
              officers, or logs added after that backup was taken will be lost.
            </p>
          </div>
          <Input
            name="confirm"
            label={`Type RESTORE to confirm`}
            value={restoreModal.confirm}
            onChange={(e) => setRestoreModal((s) => ({ ...s, confirm: e.target.value }))}
            placeholder="RESTORE"
            disabled={restoreModal.running}
          />
          {restoreModal.error && <p className="text-sm font-semibold text-red-600">{restoreModal.error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRestoreModal({ name: '', confirm: '', running: false, result: null, error: '' })} disabled={restoreModal.running}>
              Cancel
            </Button>
            <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={runRestoreLive} disabled={restoreModal.running || restoreModal.confirm.trim() !== 'RESTORE'}>
              {restoreModal.running ? (
                <>
                  <RefreshCw size={14} className="mr-1.5 animate-spin" />
                  Restoring…
                </>
              ) : (
                <>
                  <Undo2 size={14} className="mr-1.5" />
                  Restore Live Database
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore success modal */}
      <Modal isOpen={!!restoreModal.result} onClose={() => setRestoreModal({ name: '', confirm: '', running: false, result: null, error: '' })} title="Restore Complete">
        {restoreModal.result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">
              <ShieldCheck size={18} />
              Live database restored from <code className="font-mono">{restoreModal.result.backup}</code>.
            </div>
            <ul className="text-sm text-slate-700">
              {Object.entries(restoreModal.result.counts || {}).map(([table, count]) => (
                <li key={table} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="font-medium">{table}</span>
                  <span className="tabular-nums">{count ?? '—'} rows</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">Every user session was preserved; officers may need to refresh. Restarting the backend is recommended after a full restore.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BackupsPage;
