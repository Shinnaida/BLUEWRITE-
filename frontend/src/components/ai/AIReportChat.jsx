import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, PenLine, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import Button from '../common/Button';
import Textarea from '../common/Textarea';
import { recordSuggestionDecision, requestReportAssistance } from '../../services/aiService';

const ACTIONS = [
  { key: 'generate', label: 'Generate Report', icon: FileText },
  { key: 'improve', label: 'Improve Writing', icon: PenLine },
  { key: 'check', label: 'Check Narrative', icon: ClipboardCheck },
];

const WRITING_PRESETS = [
  { key: 'concise', label: 'Make more concise' },
  { key: 'clarity', label: 'Improve grammar and clarity' },
  { key: 'chronology', label: 'Improve chronological order' },
  { key: 'neutral', label: 'Use neutral wording' },
  { key: 'verify', label: 'Identify details to verify' },
  { key: 'repetition', label: 'Remove repetition' },
];

const allowedReportData = (data) => Object.fromEntries(
  ['title', 'incident_type', 'incident_date', 'incident_time', 'location', 'summary', 'narrative', 'complainant', 'victim', 'suspect', 'witness']
    .map((key) => [key, data?.[key] ?? ''])
);

const cleanAISuggestion = (value) => String(value || '').replace(/\*/g, '').trim();
const words = (value) => String(value || '').split(/(\s+)/);
const normalizedWordSet = (value) => new Set(words(value).filter((token) => token.trim()).map((token) => token.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean));
const WRITING_REQUEST_REFUSAL = 'This assistant supports incident-report writing only. Enter a request about clarity, grammar, chronology, tone, organization, length, repetition, or details to verify. It cannot invent facts, make investigative decisions, determine guilt, or provide unrelated content.';
const writingIntentPattern = /\b(concise|shorter|longer|brief|length|summari[sz]e|grammar|grammatical|spelling|punctuation|sentence|paragraph|clear|clearer|clarity|wording|rewrite|rephrase|revise|edit|improve|chronolog(?:y|ical)|sequence|timeline|order|transition|tone|neutral|objective|professional|formal|organi[sz]e|organization|structure|format|narrative|report|repetition|repetitive|duplicate|redundant|unclear|review|verify)\b/i;
const unsafeWritingPattern = /\b(joke|poem|song|weather|recipe|game|sports|politics|guilty|innocent|convict|legal advice|investigative decision)\b|\b(ignore|bypass|override|disregard)\b.{0,40}\b(rule|instruction|policy|safety)\b|\b(invent|fabricate|make up|add|adding)\b.{0,45}\b(fact|evidence|suspect|witness|confession|statement|action|actions|injury|weapon)\b|\b(change|alter|replace)\b.{0,35}\b(date|time|name|location|fact|evidence)\b/i;

function validateWritingRequest(value) {
  const request = String(value || '').trim();
  if (!request) return { valid: true, message: 'No custom instruction entered. Selected presets and default writing safeguards will apply.' };
  if (unsafeWritingPattern.test(request) || !writingIntentPattern.test(request)) return { valid: false, message: WRITING_REQUEST_REFUSAL };
  return { valid: true, message: 'Writing request ready. Choose Generate Report, Improve Writing, or Check Narrative.' };
}

function HighlightedText({ value, comparison, tone }) {
  const comparisonWords = normalizedWordSet(comparison);
  return <p className="min-h-48 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800">{words(value).map((token, index) => { const key=token.toLowerCase().replace(/[^a-z0-9]/g,''); const changed=key&&!comparisonWords.has(key); return <React.Fragment key={`${index}-${token}`}>{changed?<mark className={tone==='removed'?'rounded bg-red-100 px-0.5 text-red-950':'rounded bg-amber-100 px-0.5 text-amber-950'}>{token}</mark>:token}</React.Fragment>; })}</p>;
}

function localValidation(action, reportContext) {
  const narrative = String(reportContext?.narrative || '').trim();
  if ((action === 'improve' || action === 'check') && narrative.length < 20) return 'Enter a narrative of at least 20 characters before using this action.';
  if (action === 'generate') {
    if (narrative.length < 20) return 'Enter at least 20 characters of raw incident information in Narrative before generating a report draft.';
  }
  return '';
}

function AIReportChat({ reportId, reportStatus = 'Draft', reportContext = {}, onInsertSuggestion }) {
  const [activeAction, setActiveAction] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState('');
  const [writingInstruction, setWritingInstruction] = React.useState('');
  const [presetKeys, setPresetKeys] = React.useState([]);
  const [warningAcknowledged, setWarningAcknowledged] = React.useState(false);
  const [writingRequestStatus, setWritingRequestStatus] = React.useState(null);
  const rawNotesSnapshot = React.useRef('');
  const isPersistedDraft = Boolean(reportId) && reportStatus === 'Draft';

  const request = async (action, { reuseSnapshot = false } = {}) => {
    if (!isPersistedDraft || activeAction) return;
    const sourceNotes = reuseSnapshot && rawNotesSnapshot.current ? rawNotesSnapshot.current : String(reportContext.narrative || '');
    const sourceContext = { ...reportContext, narrative: sourceNotes };
    const validationMessage = localValidation(action, sourceContext);
    if (validationMessage) { setError(validationMessage); return; }
    if (!reuseSnapshot || !rawNotesSnapshot.current) rawNotesSnapshot.current = sourceNotes;
    setActiveAction(action); setError('');
    try {
      const response = await requestReportAssistance({ action, reportId, reportData: allowedReportData(sourceContext), writingInstruction: writingInstruction.trim(), presetKeys });
      setPreview({ ...response.data.data, suggestion: cleanAISuggestion(response.data.data.suggestion), original: rawNotesSnapshot.current });
      setWarningAcknowledged(false);
    } catch (requestError) {
      const timedOut = requestError.code === 'ECONNABORTED' || requestError.code === 'ETIMEDOUT';
      setError(requestError.response?.data?.message || (timedOut ? 'Google AI Studio did not respond before the request deadline. Please try again; your entered incident information has not been lost.' : 'Unable to generate the report. Your entered incident information has not been lost.'));
    } finally { setActiveAction(''); }
  };

  const useSuggestion = async () => {
    if (!preview || preview.reviewReady === false || !['generate', 'improve'].includes(preview.action)) return;
    try {
      await recordSuggestionDecision({ action: preview.action, reportId, decision: 'accepted', factualDifferenceWarning: preview.factAnalysis?.hasWarning });
      onInsertSuggestion?.(preview.action === 'generate' ? preview.reportDraft : { narrative: preview.suggestion });
      setPreview(null); setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record suggestion acceptance. Your narrative has not been changed.');
    }
  };

  const dismissPreview = async () => {
    const dismissed = preview;
    setPreview(null); setError(''); setWarningAcknowledged(false);
    if (dismissed && ['generate','improve'].includes(dismissed.action)) {
      await recordSuggestionDecision({ action: dismissed.action, reportId, decision: 'rejected', factualDifferenceWarning: dismissed.factAnalysis?.hasWarning }).catch(() => {});
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="BLUEWRITE AI Writing Assistant">
      <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-police-blue-700 text-white"><ShieldCheck size={20} /><Sparkles size={10} className="absolute -right-0.5 -top-0.5 text-amber-400" /></div>
          <div><h3 className="font-bold text-slate-950">AI Report Assistant</h3><p className="text-xs font-medium text-slate-600">Creates an editable report draft from your narrative</p></div>
        </div>
        <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-950">AI-generated narrative. Review and verify all facts before finalizing.</p>
      </header>
      <div className="space-y-4 p-5" aria-live="polite">
        {!reportId && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Save this report as a Draft first. AI requests require a persisted report so BLUEWRITE can verify ownership.</p>}
        {reportId && reportStatus !== 'Draft' && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">AI assistance is unavailable because this report is no longer editable.</p>}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Safe writing presets</p>
          <div className="mb-4 flex flex-wrap gap-2">{WRITING_PRESETS.map((preset) => { const selected=presetKeys.includes(preset.key); return <button key={preset.key} type="button" aria-pressed={selected} disabled={!isPersistedDraft||Boolean(activeAction)} onClick={() => setPresetKeys((current) => selected?current.filter((key)=>key!==preset.key):[...current,preset.key])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected?'border-blue-700 bg-blue-700 text-white':'border-slate-300 bg-white text-slate-700 hover:border-blue-400'} disabled:cursor-not-allowed disabled:opacity-50`}>{preset.label}</button>; })}</div>
          <Textarea label="Writing instructions (optional)" name="ai-writing-instruction" value={writingInstruction} onChange={(event) => { setWritingInstruction(event.target.value); setWritingRequestStatus(null); }} placeholder="Example: Make the narrative concise, keep a neutral tone, and preserve every supplied fact." rows={3} maxLength={500} disabled={!isPersistedDraft || Boolean(activeAction)} />
          <div className="mt-1 flex flex-wrap items-start justify-between gap-2 text-xs leading-5 text-slate-500"><p>Describe only how to improve the writing. Add new incident facts to the report form first. The assistant cannot invent facts, evidence, conclusions, or Officer actions.</p><span className="shrink-0 font-semibold">{writingInstruction.length}/500</span></div>
          <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" size="sm" variant="secondary" disabled={!isPersistedDraft||Boolean(activeAction)} onClick={() => setWritingRequestStatus(validateWritingRequest(writingInstruction))}><Send size={15} className="mr-2" />Apply Writing Request</Button><p className="text-xs text-slate-500">Validates the request only. It does not contact the AI.</p></div>
          {writingRequestStatus&&<p role="status" className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm ${writingRequestStatus.valid?'border-emerald-200 bg-emerald-50 text-emerald-900':'border-red-200 bg-red-50 text-red-800'}`}>{writingRequestStatus.valid?<CheckCircle2 size={17} className="mt-0.5 shrink-0"/>:<AlertTriangle size={17} className="mt-0.5 shrink-0"/>}{writingRequestStatus.message}</p>}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {ACTIONS.map(({ key, label, icon: Icon }) => <Button key={key} variant="secondary" className="w-full justify-center" disabled={!isPersistedDraft || Boolean(activeAction)} onClick={() => request(key)}><Icon size={16} className="mr-2" />{activeAction === key ? (key === 'check' ? 'Checking narrative...' : 'Generating report draft...') : label}</Button>)}
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {preview && <div className="rounded-xl border border-police-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start justify-between gap-3"><h4 className="font-bold text-slate-950">{preview.action === 'generate' ? 'AI Report Draft' : (preview.action === 'check' ? 'AI Narrative Review' : 'AI Suggested Narrative')}</h4><button type="button" onClick={dismissPreview} aria-label="Reject and close AI suggestion" className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900"><X size={17} /></button></div>
          <p className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs leading-5 text-blue-950"><strong>Writing request applied:</strong> {preview.appliedWritingRequest || 'Default factual, neutral report-writing assistance.'}</p>
          {preview.action!=='check'&&<div className={`mt-3 rounded-lg border p-3 text-sm ${preview.reviewReady===false?'border-red-300 bg-red-50 text-red-950':'border-emerald-200 bg-emerald-50 text-emerald-950'}`}><p className="font-bold">{preview.reviewReady===false?'Generated draft requires correction':'Validated draft — ready for officer review'}</p><p className="mt-1 text-xs">Fact confidence: {Math.round((preview.validation?.confidence??0)*100)}%. Deterministic corrective retries: {preview.retryCount||0} of 1.</p>{preview.correction?.retryTimedOut&&<p className="mt-1 text-xs">The optional correction pass reached its time limit. BLUEWRITE retained the complete first response for comparison; no sentences were silently deleted.</p>}{preview.reviewReady===false&&<p className="mt-1 text-xs">Unresolved factual findings remain. The complete AI draft is shown for transparency but cannot be inserted automatically; compare it with the source notes, correct the source information if needed, or regenerate.</p>}</div>}
          {preview.factAnalysis?.hasWarning && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p className="flex items-start gap-2 font-bold"><AlertTriangle size={18} className="mt-0.5 shrink-0" />Review possible factual differences</p><p className="mt-1 text-xs leading-5">The suggestion may add or change details, remove uncertainty, or alter action status. Compare it with the original officer notes before continuing. BLUEWRITE does not delete flagged sentences.</p>{preview.factAnalysis.categories?.length>0&&<p className="mt-1 text-xs"><strong>Findings:</strong> {preview.factAnalysis.categories.join('; ')}</p>}{preview.factAnalysis.newProtectedValues?.length>0&&<p className="mt-1 text-xs"><strong>New values:</strong> {preview.factAnalysis.newProtectedValues.join(', ')}</p>}{preview.factAnalysis.missingSuppliedNames?.length>0&&<p className="mt-1 text-xs"><strong>Names not detected:</strong> {preview.factAnalysis.missingSuppliedNames.join(', ')}</p>}{preview.factAnalysis.removedUncertainty?.length>0&&<p className="mt-1 text-xs"><strong>Possibly removed uncertainty:</strong> {preview.factAnalysis.removedUncertainty.join(', ')}</p>}{preview.factAnalysis.changedDescriptions?.length>0&&<p className="mt-1 text-xs"><strong>Description checks:</strong> {preview.factAnalysis.changedDescriptions.join(', ')}</p>}{preview.factAnalysis.unsupportedCompletedActions?.length>0&&<p className="mt-1 text-xs"><strong>Possible completed-action claims:</strong> {preview.factAnalysis.unsupportedCompletedActions.length}</p>}{preview.correction?.attempted&&<p className="mt-1 text-xs"><strong>Auto-correction:</strong> One corrective regeneration was attempted.</p>}</div>}
          {preview.validation?.issues?.length>0&&<div className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-xs text-red-900"><strong>Validation issues:</strong><ul className="mt-1 list-disc space-y-1 pl-5">{preview.validation.issues.map((finding,index)=><li key={`${finding.category}-${index}`}><span className="font-semibold">{finding.category}:</span> {finding.message}</li>)}</ul>{preview.validation.role_conflicts?.length>0&&<p className="mt-2"><strong>Role conflicts:</strong> {preview.validation.role_conflicts.map((conflict)=>`${conflict.entity}: ${conflict.locked_role} → ${conflict.draft_role}`).join('; ')}</p>}{preview.validation.unsupported_details?.length>0&&<p className="mt-1"><strong>Unsupported details:</strong> {preview.validation.unsupported_details.join('; ')}</p>}</div>}
          {preview.structuredFacts?.conflicts?.length>0&&<div className="mt-3 rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-950"><strong>Verification required:</strong><ul className="mt-1 list-disc space-y-1 pl-5">{preview.structuredFacts.conflicts.map((conflict,index)=><li key={`${conflict.category}-${index}`}>{conflict.message}{conflict.resolved_by&&<span> Canonical Officer-entered data was used for drafting.</span>}</li>)}</ul></div>}
          {preview.structuredFacts&&preview.action!=='check'&&<details className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><summary className="cursor-pointer font-bold text-slate-900">View locked source facts</summary><p className="mt-2"><strong>Incident:</strong> {[preview.structuredFacts.incident?.type,preview.structuredFacts.incident?.date,preview.structuredFacts.incident?.time,preview.structuredFacts.incident?.location].filter(Boolean).join(' | ')||'Not provided'}</p><p className="mt-1"><strong>People and locked roles:</strong> {preview.structuredFacts.persons?.map((person)=>`${person.name} (${person.locked_role})${person.description?.length?` — ${person.description.join(', ')}`:''}`).join('; ')||'None supplied'}</p><p className="mt-1"><strong>Uncertainty:</strong> {preview.structuredFacts.uncertainties?.join(', ')||'None detected'}</p><p className="mt-1"><strong>Pending/unavailable actions:</strong> {preview.structuredFacts.pending_actions?.map((item)=>item.detail).join('; ')||'None detected'}</p></details>}
          {preview.action==='generate'&&preview.reportDraft&&<div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-sm text-slate-800"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Proposed Report Fields</p><dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[9rem_1fr]">{[['Title','title'],['Incident Type','incident_type'],['Incident Date','incident_date'],['Incident Time','incident_time'],['Location','location'],['Summary','summary'],['Complainant','complainant'],['Victim','victim'],['Suspect','suspect'],['Witness','witness']].map(([label,key])=><React.Fragment key={key}><dt className="font-semibold text-slate-600">{label}</dt><dd className="break-words">{preview.reportDraft[key]||'Not supplied — left blank'}</dd></React.Fragment>)}</dl></div>}
          {preview.reportFieldIssues?.length>0&&<div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><strong>Fields left blank for verification:</strong><ul className="mt-1 list-disc space-y-1 pl-5">{preview.reportFieldIssues.map((finding,index)=><li key={`${finding.field}-${index}`}><span className="font-semibold">{finding.field.replaceAll('_',' ')}:</span> {finding.message}</li>)}</ul></div>}
          <div className="mt-3 grid gap-3 lg:grid-cols-2"><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Original Officer Narrative</p><p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">{preview.original || 'No original narrative available.'}</p></div><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Generated Report Narrative</p><p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-blue-200 bg-white p-3 text-sm leading-6 text-slate-800">{preview.suggestion}</p></div></div>
          {preview.action === 'improve' ? <div className="mt-3 grid gap-3 lg:grid-cols-2"><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Original — removed/changed words</p><HighlightedText value={preview.original} comparison={preview.suggestion} tone="removed" /></div><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Suggestion — added/changed words</p><HighlightedText value={preview.suggestion} comparison={preview.original} tone="added" /></div></div> : preview.action === 'check' && <div className="mt-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Suggestions</p><p className="mt-1 min-h-48 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-blue-200 bg-white p-4 text-sm leading-7 text-slate-800">{preview.suggestion}</p></div>}
          {preview.factAnalysis?.hasWarning&&preview.action!=='check'&&<label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-800"><input type="checkbox" checked={warningAcknowledged} onChange={(event)=>setWarningAcknowledged(event.target.checked)} className="mt-1" /><span>I reviewed the flagged differences and verified the suggestion against the report facts.</span></label>}
          <div className="mt-4 flex flex-wrap gap-2">{preview.action !== 'check' && <Button size="sm" disabled={preview.reviewReady===false||(preview.factAnalysis?.hasWarning&&!warningAcknowledged)} onClick={useSuggestion}>{preview.action==='generate'?'Use Report Draft':'Use This Narrative'}</Button>}<Button size="sm" variant="secondary" disabled={Boolean(activeAction)} onClick={() => request(preview.action, { reuseSnapshot: true })}>{activeAction ? 'Generating...' : 'Regenerate'}</Button><Button size="sm" variant="ghost" onClick={dismissPreview}>{preview.action==='check'?'Close':'Reject Suggestion'}</Button></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">AI-generated draft. Review and verify every field before saving or submitting. Using a report draft updates editable form fields only; it never saves or submits automatically.</p>
        </div>}
      </div>
    </section>
  );
}

export { allowedReportData, cleanAISuggestion, localValidation, validateWritingRequest };
export default AIReportChat;