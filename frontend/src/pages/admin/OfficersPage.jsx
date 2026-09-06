// BLUEWRITE — Admin OfficersPage
// Manage officers with enable/disable status (NO delete, Phase 1.3).

import React, { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, LockOpen, Search, UserPlus, Power, PowerOff, RotateCcw, Pencil, ShieldCheck, ShieldAlert, Users, FileClock } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import { USER_STATUS_OPTIONS } from '../../utils/constants';
import Pagination from '../../components/common/Pagination';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AddOfficerModal from '../../components/admin/AddOfficerModal';
import { createOfficer, getOfficers, resetOfficerPassword, unlockOfficer, updateOfficer, updateOfficerStatus } from '../../services/officerService';

function OfficersPage() {
  const [officers, setOfficers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingOfficer, setPendingOfficer] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [credentialReason, setCredentialReason] = useState('created');
  const pageSize = 10;

  const loadOfficers = async (requestedPage = page) => { setLoading(true); setLoadError(''); try { const response = await getOfficers({ search, status: status&&status!=='locked' ? status[0].toUpperCase()+status.slice(1).toLowerCase() : "", locked:status==='locked'?'true':undefined, page: requestedPage, limit: pageSize }); setOfficers(response.data.data); setPagination(response.data.pagination); } catch { setLoadError('Unable to load officers.'); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(loadOfficers, 250); return () => window.clearTimeout(timer); }, [search, status, page]);

  const toggleStatus = async (id) => { const officer=officers.find(item=>item.id===id); const next=officer.status==='Active'?'Disabled':'Active'; try { await updateOfficerStatus(id,next); setPendingOfficer(null); setToast({message:`Officer ${next==='Active'?'enabled':'disabled'} successfully.`,type:'success'}); await loadOfficers(); } catch(e) { setToast({message:e.response?.data?.message||'Unable to update Officer.',type:'error'}); } };
  const submitCreate = async (data) => { const response=await createOfficer(data); setShowCreate(false); setCreatedCredentials(response.data.data.credentials); setCredentialReason('created'); setCredentialsCopied(false); setToast({message:'Officer account created successfully.',type:'success'}); setPage(1); await loadOfficers(1); };
  const copyCredentials = async () => { if(!createdCredentials)return;await navigator.clipboard.writeText(`BLUEWRITE Username: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.temporaryPassword}`);setCredentialsCopied(true); };
  const submitEdit = async () => { try { await updateOfficer(editingOfficer.id,editingOfficer); setEditingOfficer(null); setToast({message:'Officer profile updated.',type:'success'}); await loadOfficers(); } catch(e) { setToast({message:e.response?.data?.message||'Unable to update Officer.',type:'error'}); } };
  const submitUnlock = async (row) => { try { await unlockOfficer(row.id); setToast({message:'Officer account unlocked successfully.',type:'success'}); await loadOfficers(); } catch(e) { setToast({message:e.response?.data?.message||'Unable to unlock Officer.',type:'error'}); } };
  const submitPasswordReset = async (row) => { if(!window.confirm(`Generate a new temporary password for ${row.first_name} ${row.last_name}? Existing sessions will be revoked.`))return;try{const response=await resetOfficerPassword(row.id);setCreatedCredentials(response.data.data.credentials);setCredentialReason('reset');setCredentialsCopied(false);setToast({message:'Temporary password generated.',type:'success'});await loadOfficers();}catch(e){setToast({message:e.response?.data?.message||'Unable to reset Officer password.',type:'error'});} };

  const closeStatusDialog = () => setPendingOfficer(null);

  const hasActiveFilters = Boolean(search || status);

  const columns = [
    {
      key: 'badge_number',
      label: 'Badge #',
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-police-blue-50 px-2 py-0.5 font-mono text-[12.5px] font-bold text-police-blue-700 ring-1 ring-inset ring-police-blue-100">
          {row.badge_number}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-extrabold text-slate-600 ring-1 ring-inset ring-slate-200" aria-hidden="true">
            {(row.first_name?.[0] || '') + (row.last_name?.[0] || '')}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{`${row.first_name} ${row.last_name}`}</p>
            <p className="truncate text-xs text-slate-500">@{row.username}</p>
          </div>
        </div>
      ),
    },
    { key: 'rank', label: 'Rank', render: (row) => row.rank ? <span className="text-slate-700">{row.rank}</span> : <span className="text-slate-300">—</span> },
    { key: 'unit', label: 'Unit', render: (row) => row.unit ? <span className="text-slate-700">{row.unit}</span> : <span className="text-slate-300">—</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.account_locked ? 'locked' : row.status === 'Active' ? 'active' : 'disabled'}>
          {row.account_locked ? 'Locked' : row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setEditingOfficer({...row})} title="Edit profile">
            <Pencil size={14} className="mr-1.5" />Edit
          </Button>
          {row.account_locked && (
            <Button variant="secondary" size="sm" onClick={()=>submitUnlock(row)} className="border-amber-300 text-amber-800 hover:bg-amber-50" title="Unlock account">
              <LockOpen size={14} className="mr-1.5" />Unlock
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={()=>submitPasswordReset(row)} title="Generate temporary password">
            <KeyRound size={14} className="mr-1.5" />Reset Password
          </Button>
          <Button
            variant={row.status === 'Active' ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => setPendingOfficer(row)}
            title={row.status === 'Active' ? 'Disable account' : 'Enable account'}
          >
            {row.status === 'Active' ? (
              <>
                <PowerOff size={14} className="mr-1.5" />
                Disable
              </>
            ) : (
              <>
                <Power size={14} className="mr-1.5" />
                Enable
              </>
            )}
          </Button>
          <a
            href={`/admin/activity-logs?officer=${encodeURIComponent(row.badge_number)}`}
            className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-police-blue-400 hover:bg-police-blue-50 hover:text-police-blue-700"
            title="View activity logs"
          >
            <FileClock size={14} className="mr-1.5" />Activity
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white shadow-md shadow-blue-700/25 sm:flex" aria-hidden="true">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Manage Officers</h2>
            <p className="mt-0.5 text-sm text-slate-600">Create and manage police Officer accounts.</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="shadow-md shadow-blue-700/20 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-700/25"
        >
          <UserPlus size={16} className="mr-2" />
          Add Officer
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              name="search"
              placeholder="Search by badge #, name, or unit..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>
          <div className="w-40">
            <select
              aria-label="Officer status"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"
            >
              <option value="">All Officers</option>
              {USER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setPage(1); }} className="text-slate-500 hover:text-slate-900">
              <RotateCcw size={14} className="mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Officers table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
            <ShieldCheck size={17} className="text-police-blue-700" aria-hidden="true" />
            Officer Accounts
          </h3>
          {!loading && !loadError && (
            <span className="rounded-full bg-police-blue-50 px-2.5 py-0.5 text-xs font-bold text-police-blue-700 ring-1 ring-inset ring-police-blue-200">
              {pagination.total} total
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading officers..." />
        ) : loadError ? (
          <div className="py-12 text-center">
            <ShieldAlert size={36} className="mx-auto text-red-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-red-700">{loadError}</p>
            <p className="mt-1 text-xs text-slate-500">Check the connection and try again.</p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={() => loadOfficers()}>
              <RotateCcw size={14} className="mr-1.5" />
              Retry
            </Button>
          </div>
        ) : officers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
              <Users size={22} className="text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">
              {hasActiveFilters ? 'No officers match your filters' : 'No officers yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters ? 'Try adjusting your search or status filter.' : 'Create the first Officer account to get started.'}
            </p>
            {!hasActiveFilters && (
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                <UserPlus size={14} className="mr-1.5" />
                Add Officer
              </Button>
            )}
          </div>
        ) : (
          <Table columns={columns} data={officers} emptyMessage="No officers found" />
        )}

        {!loading && !loadError && officers.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{officers.length}</span> of <span className="font-bold text-slate-800">{pagination.total}</span> officers
            </p>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Officers are disabled rather than deleted. Disabling an account prevents login but preserves historical reports.
        </p>
      </div>

      {/* Status confirmation dialog */}
      {pendingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="officer-status-dialog-title">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 id="officer-status-dialog-title" className="text-lg font-bold text-slate-950">{pendingOfficer.status === 'Active' ? 'Disable Officer?' : 'Enable Officer?'}</h2>
              <button type="button" onClick={closeStatusDialog} className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-police-blue-500" aria-label="Close">
                <span aria-hidden="true" className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-600" aria-hidden="true">
                  {(pendingOfficer.first_name?.[0] || '') + (pendingOfficer.last_name?.[0] || '')}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{`${pendingOfficer.first_name} ${pendingOfficer.last_name}`}</p>
                  <p className="text-xs text-slate-500">Badge #{pendingOfficer.badge_number} · @{pendingOfficer.username}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {pendingOfficer.status === 'Active'
                  ? 'This Officer will no longer be able to sign in. Their existing reports and activity records will remain available.'
                  : 'This Officer will be restored to active status and can sign in again.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={closeStatusDialog} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-police-blue-500">Cancel</button>
              <button type="button" onClick={() => toggleStatus(pendingOfficer.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${pendingOfficer.status === 'Active' ? 'bg-red-700 hover:bg-red-800' : 'bg-police-blue-700 hover:bg-police-blue-600'}`}>
                {pendingOfficer.status === 'Active' ? 'Disable Officer' : 'Enable Officer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AddOfficerModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={submitCreate} />
      {createdCredentials&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="credentials-title"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 id="credentials-title" className="flex items-center gap-2 text-xl font-bold text-slate-950"><ShieldCheck size={20} className="text-green-600" aria-hidden="true" />{credentialReason==='reset'?'Password reset successfully':'Officer account created'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">Save these credentials now. The temporary password cannot be retrieved after this window is closed.</p><dl className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Username</dt><dd className="mt-1 break-all font-mono text-base font-bold text-slate-950">{createdCredentials.username}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Temporary Password</dt><dd className="mt-1 break-all font-mono text-base font-bold text-slate-950">{createdCredentials.temporaryPassword}</dd></div></dl><p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">The Officer must change this password during the next login.</p><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={copyCredentials}>{credentialsCopied?<Check size={16} className="mr-2"/>:<Copy size={16} className="mr-2"/>}{credentialsCopied?'Copied':'Copy Credentials'}</Button><Button onClick={()=>{setCreatedCredentials(null);setCredentialsCopied(false);}}>Done</Button></div></div></div>}
      {editingOfficer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><h2 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Pencil size={18} className="text-police-blue-700" aria-hidden="true" />Edit Officer</h2><p className="mt-1 text-sm leading-6 text-slate-600">Changing the email updates where future login verification codes are sent and signs the Officer out of existing sessions.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{[['badge_number','Badge Number'],['first_name','First Name'],['last_name','Last Name'],['rank','Rank'],['unit','Unit'],['department','Department'],['email','Email'],['phone','Phone']].map(([key,label])=><Input key={key} name={key} label={label} type={key==='email'?'email':key==='phone'?'tel':'text'} required={['badge_number','first_name','last_name','email'].includes(key)} value={editingOfficer[key]||''} onChange={e=>setEditingOfficer({...editingOfficer,[key]:e.target.value})} />)}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={()=>setEditingOfficer(null)}>Cancel</Button><Button onClick={submitEdit}>Save Changes</Button></div></div></div>}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}

export default OfficersPage;
