// BLUEWRITE — Officer EditReportPage
// Edit incident report page with full form and AI assistant panel (Phase 1.3).
// UX: contextual page header, inline alert banner, and a sticky frosted action
// bar that keeps save state and submit readiness visible while scrolling.

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Lock,
  X,
} from 'lucide-react';
import Button from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/Modal';
import ReportForm from '../../components/reports/ReportForm';
import { INCIDENT_TYPE_OPTIONS } from '../../utils/constants';
import Toast from '../../components/common/Toast';
import AIReportChat from '../../components/ai/AIReportChat';
import { getReport, updateReport, submitReport, deleteReport } from '../../services/reportService';

const STATUS_BADGE = {
  Draft: 'border-amber-300 bg-amber-50 text-amber-800',
  Submitted: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Approved: 'border-blue-300 bg-blue-50 text-blue-800',
};

// Submission requirements — mirrors the submit-time validation rules.
const SUBMIT_REQUIREMENTS = [
  { key: 'incident_type', label: 'incident type', met: (d) => Boolean(String(d.incident_type || '').trim()) },
  { key: 'incident_date', label: 'incident date', met: (d) => Boolean(String(d.incident_date || '').trim()) },
  { key: 'incident_time', label: 'incident time', met: (d) => Boolean(String(d.incident_time || '').trim()) },
  { key: 'location', label: 'location', met: (d) => Boolean(String(d.location || '').trim()) },
  { key: 'narrative', label: 'narrative (30+ characters)', met: (d) => String(d.narrative || '').trim().length >= 30 },
];

function EditReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [report, setReport] = React.useState({});
  const [formData, setFormData] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [formMessage, setFormMessage] = React.useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saveState, setSaveState] = React.useState('');
  const [pending, setPending] = React.useState('');
  const [toast, setToast] = React.useState({ message: '', type: 'info' });
  const initialData = React.useRef('{}');
  // The AI assistant registers a getter here that returns the pending validated
  // draft (or null) so Save/Submit can include an open AI preview automatically.
  const getPendingAIDraft = React.useRef(null);
  const [pendingAIDraft, setPendingAIDraft] = React.useState(null);
  // Floating assistant popover: hidden by default. AIReportChat stays MOUNTED
  // inside it (CSS-hidden when closed) so an open AI preview and its registered
  // apply-getter survive close/reopen — closing never discards a pending draft.
  // It makes zero AI calls on mount or open; requests fire only on explicit
  // button clicks inside it.
  const [assistantOpen, setAssistantOpen] = React.useState(false);

  React.useEffect(() => {
    getReport(id)
      .then((r) => { setReport(r.data.data); setFormData(r.data.data); initialData.current = JSON.stringify(r.data.data); })
      .catch(() => setFormMessage('Unable to load report.'));
  }, [id]);

  React.useEffect(() => {
    if (JSON.stringify(formData) === initialData.current) return undefined;
    setSaveState('Saving draft locally...');
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(`bluewrite:edit-draft:${id}`, JSON.stringify(formData));
      setSaveState(`Draft saved locally at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [formData, id]);

  React.useEffect(() => {
    const warn = (event) => {
      if (JSON.stringify(formData) !== initialData.current) { event.preventDefault(); event.returnValue = 'You have unsaved changes.'; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formData]);

  const isEditable = !report.status || report.status === 'Draft';
  const isDirty = JSON.stringify(formData) !== initialData.current;
  // Submit readiness considers an open validated AI draft — if the officer saves
  // or submits now, that draft is included automatically.
  const effectiveData = React.useMemo(() => ({ ...formData, ...(pendingAIDraft || {}) }), [formData, pendingAIDraft]);
  const missingRequirements = SUBMIT_REQUIREMENTS.filter((requirement) => !requirement.met(effectiveData));

  const validate = (isSubmit) => {
    const nextErrors = {};
    if (!effectiveData.incident_type?.trim()) nextErrors.incident_type = 'Incident type is required.';
    if (!effectiveData.incident_date?.trim()) nextErrors.incident_date = 'Incident date is required.';
    if (!effectiveData.incident_time?.trim() && isSubmit) nextErrors.incident_time = 'Incident time is required.';
    if (!effectiveData.location?.trim()) nextErrors.location = 'Incident location is required.';
    if (isSubmit && (!effectiveData.narrative || effectiveData.narrative.trim().length < 30)) nextErrors.narrative = 'Narrative must be at least 30 characters.';
    setErrors(nextErrors);
    setFormMessage(Object.keys(nextErrors).length ? 'Please correct the highlighted fields before continuing.' : '');
    return Object.keys(nextErrors).length === 0;
  };

  const mergePendingAIDraft = () => {
    const aiDraft = getPendingAIDraft.current?.() || null;
    if (!aiDraft) return { payload: formData, applied: false };
    return { payload: { ...formData, ...aiDraft }, applied: true };
  };

  const saveDraft = async () => {
    if (pending || !validate(false)) return;
    setPending('save');
    try {
      const { payload, applied } = mergePendingAIDraft();
      const r = await updateReport(id, payload);
      if (applied) setFormData((current) => ({ ...current, ...payload }));
      setReport(r.data.data);
      initialData.current = JSON.stringify(r.data.data);
      setToast({ message: applied ? 'Draft saved with the AI-generated report applied.' : 'Draft saved to database.', type: 'success' });
    } catch (e) {
      setFormMessage(e.response?.data?.message || 'Unable to update report.');
    } finally {
      setPending('');
    }
  };

  const submitReportFlow = async () => {
    setPending('submit');
    try {
      const { payload } = mergePendingAIDraft();
      await updateReport(id, payload);
      await submitReport(id);
      setShowSubmitConfirm(false);
      navigate('/officer/reports');
    } catch (e) {
      setShowSubmitConfirm(false);
      setFormMessage(e.response?.data?.message || 'Unable to submit report.');
    } finally {
      setPending('');
    }
  };

  const deleteDraftFlow = async () => {
    setPending('delete');
    try {
      await deleteReport(id);
      window.localStorage.removeItem(`bluewrite:edit-draft:${id}`);
      initialData.current = JSON.stringify(formData); // skip the unsaved-changes prompt
      setShowDeleteConfirm(false);
      navigate('/officer/reports');
    } catch (e) {
      setShowDeleteConfirm(false);
      setFormMessage(e.response?.data?.message || 'Unable to delete report.');
    } finally {
      setPending('');
    }
  };

  const saveIndicator = (() => {
    if (saveState === 'Saving draft locally...') {
      return (
        <span className="flex items-center gap-2 text-xs font-medium text-police-blue-700">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-police-blue-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-police-blue-600" /></span>
          Saving locally…
        </span>
      );
    }
    if (saveState.startsWith('Draft saved locally')) {
      return <span className="flex items-center gap-2 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} />{saveState}</span>;
    }
    if (isDirty) {
      return <span className="flex items-center gap-2 text-xs font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Unsaved changes</span>;
    }
    return <span className="flex items-center gap-2 text-xs font-medium text-slate-500"><CheckCircle2 size={14} />All changes saved</span>;
  })();

  const readinessPill = missingRequirements.length === 0 ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      <CheckCircle2 size={13} />Ready to submit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" title={`Still needed: ${missingRequirements.map((r) => r.label).join(', ')}`}>
      {missingRequirements.length} requirement{missingRequirements.length === 1 ? '' : 's'} remaining
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <button
          type="button"
          onClick={() => navigate('/officer/reports')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-police-blue-700"
        >
          <ArrowLeft size={15} />Back to reports
        </button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Edit Incident Report</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {report.report_number && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-slate-700">
                  <FileText size={12} className="text-slate-400" />
                  <span className="font-mono-hud">{report.report_number}</span>
                </span>
              )}
              {report.status && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[report.status] || 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{report.status}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Non-editable notice */}
      {report.status && report.status !== 'Draft' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">
          <Lock size={16} className="mt-0.5 shrink-0" />
          This report is {report.status.toLowerCase()} and can no longer be edited. AI assistance and saving are disabled.
        </div>
      )}

      {/* Form-level error banner */}
      {formMessage && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          {formMessage}
        </div>
      )}

      <ReportForm
        formData={formData}
        onChange={(next) => { setFormData(next); setFormMessage(''); }}
        errors={errors}
        disabled={!isEditable}
        incidentTypes={INCIDENT_TYPE_OPTIONS}
        onDraftWithAI={() => {
          // Open the floating assistant — no AI request fires until the officer
          // clicks a Generate/Improve/Check action inside it.
          setAssistantOpen(true);
        }}
      />

      {/* Floating assistant popover. AIReportChat remains mounted while hidden
          so its preview state and the pending-draft registration persist. */}
      <div className={assistantOpen ? '' : 'hidden'} aria-hidden={!assistantOpen}>
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setAssistantOpen(false)}
          />
          <div
            id="report-assistant-popover"
            role="dialog"
            aria-label="Report assistant"
            className="fixed bottom-24 right-4 z-50 flex max-h-[min(680px,calc(100dvh-8rem))] w-[min(480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6"
          >
            <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-police-blue-700 text-white">
                  <Bot size={15} />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold leading-tight text-slate-950">Report assistant</p>
                  <p className="text-[11px] leading-tight text-slate-500">Generate, improve, and check the narrative</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50"
                aria-label="Close assistant"
              >
                <X size={17} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AIReportChat
                reportId={id}
                reportStatus={report.status}
                reportContext={formData}
                onInsertSuggestion={(draft) => {
                  setFormData((current) => ({ ...current, ...draft }));
                  setToast({ message: 'AI report draft applied. Review every field before saving.', type: 'success' });
                }}
                onRegisterApply={(getter) => {
                  getPendingAIDraft.current = getter;
                  setPendingAIDraft(getter ? getter() : null);
                }}
              />
            </div>
          </div>
        </>
      </div>

      {/* FAB — always rendered, bottom-right */}
      <button
        type="button"
        onClick={() => setAssistantOpen((prev) => !prev)}
        aria-label={assistantOpen ? 'Close report assistant' : 'Open report assistant'}
        aria-expanded={assistantOpen}
        aria-controls="report-assistant-popover"
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-police-blue-700 text-white shadow-xl transition hover:bg-police-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-police-blue-600/50 focus-visible:ring-offset-2 sm:right-6"
      >
        {assistantOpen ? <X size={22} aria-hidden="true" /> : <Bot size={24} aria-hidden="true" />}
      </button>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-slate-200 bg-white/85 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.07)] backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {saveIndicator}
            {isEditable && readinessPill}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" disabled={Boolean(pending)} onClick={() => navigate('/officer/reports')}>Cancel</Button>
            <Button variant="secondary" disabled={!isEditable || Boolean(pending)} onClick={saveDraft}>
              {pending === 'save' && <LoaderCircle size={15} className="mr-1.5 animate-spin" aria-hidden="true" />}
              Save as Draft
            </Button>
            {isEditable && (
              <Button variant="danger" disabled={Boolean(pending)} onClick={() => setShowDeleteConfirm(true)}>
                {pending === 'delete' && <LoaderCircle size={15} className="mr-1.5 animate-spin" aria-hidden="true" />}
                Delete Draft
              </Button>
            )}
            <Button disabled={!isEditable || Boolean(pending) || missingRequirements.length > 0} onClick={() => { if (validate(true)) setShowSubmitConfirm(true); }}>
              {pending === 'submit' && <LoaderCircle size={15} className="mr-1.5 animate-spin" aria-hidden="true" />}
              Submit Report
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={submitReportFlow}
        title="Submit Incident Report?"
        description="Once submitted, this report will be marked as Submitted. Please verify all report information before continuing."
        confirmLabel="Submit Report"
      />
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={deleteDraftFlow}
        title="Delete Draft Report?"
        description="This will permanently delete this draft report and its recorded persons. This action cannot be undone. Submitted or approved reports cannot be deleted."
        confirmLabel="Delete Draft"
        variant="danger"
      />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}

export default EditReportPage;
