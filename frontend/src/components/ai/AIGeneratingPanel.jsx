// BLUEWRITE — AIGeneratingPanel
// Staged, reassuring loading state shown while the AI builds a report draft.
// Local model drafting can take one to two minutes; the staged messages and
// eased progress bar communicate that verified, careful work is happening.

import React from 'react';
import { ClipboardCheck, FileText, PenLine, ShieldCheck, Sparkles } from 'lucide-react';
import './AIGeneratingPanel.css';

const STAGES = {
  generate: [
    'Reading your raw incident narrative',
    'Structuring verified facts and locked roles',
    'Drafting the professional report narrative',
    'Checking factual consistency and chronology',
    'Preparing editable report fields for your review',
  ],
  improve: [
    'Reviewing your narrative',
    'Improving grammar, clarity, and chronology',
    'Preserving every supplied fact',
    'Polishing neutral, professional wording',
  ],
  check: [
    'Reading the narrative',
    'Comparing statements against supplied facts',
    'Preparing verification findings',
  ],
};

// Draft generation runs longest locally; improve/check are quicker.
// Keep this constant on its own line — never append code to a comment line.
const BAR_DURATION_MS = { generate: 200000, improve: 45000, check: 30000 };

const ACTION_META = {
  generate: { icon: FileText, title: 'Generating your report draft' },
  improve: { icon: PenLine, title: 'Improving your narrative' },
  check: { icon: ClipboardCheck, title: 'Reviewing your narrative' },
};

function AIGeneratingPanel({ action = 'generate' }) {
  const [stageIndex, setStageIndex] = React.useState(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const stages = STAGES[action] || STAGES.generate;
  const meta = ACTION_META[action] || ACTION_META.generate;
  const ActionIcon = meta.icon;

  React.useEffect(() => {
    setStageIndex(0);
    setElapsedSeconds(0);
    const stageTimer = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, stages.length - 1));
    }, Math.max(4000, Math.floor((BAR_DURATION_MS[action] || BAR_DURATION_MS.generate) / stages.length)));
    const elapsedTimer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => { clearInterval(stageTimer); clearInterval(elapsedTimer); };
  }, [action, stages.length]);

  const elapsedLabel = elapsedSeconds < 60
    ? `${elapsedSeconds}s`
    : `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, '0')}s`;

  return (
    <div
      className="rounded-xl border border-police-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 p-5 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label={`${meta.title} in progress`}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <svg className="bw-halo absolute inset-0 h-12 w-12" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="none" stroke="rgb(37 99 235 / 0.35)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="30 102" />
          </svg>
          <div className="bw-core flex h-9 w-9 items-center justify-center rounded-full bg-police-blue-700 text-white">
            <ActionIcon size={17} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-950">{meta.title}</h4>
            <Sparkles size={14} className="text-amber-500" aria-hidden="true" />
          </div>
          <p key={stageIndex} className="bw-stage-text mt-1 text-sm font-medium text-police-blue-700">
            {stages[stageIndex]}
            <span className="ml-1 inline-flex gap-1 align-middle" aria-hidden="true">
              <span className="bw-dot inline-block h-1 w-1 rounded-full bg-police-blue-600" />
              <span className="bw-dot inline-block h-1 w-1 rounded-full bg-police-blue-600" />
              <span className="bw-dot inline-block h-1 w-1 rounded-full bg-police-blue-600" />
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {elapsedLabel} elapsed — every sentence is checked against your supplied facts, so quality takes a moment.
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className={`bw-progress-bar h-full rounded-full bg-gradient-to-r from-police-blue-600 via-police-blue-500 to-cyan-400 ${action !== 'generate' ? 'bw-progress-bar--fast' : ''}`}
              style={action !== 'generate' ? { animationDuration: '45s' } : undefined}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
            <span className="bw-shimmer-line block h-2.5 rounded-full bg-slate-100" />
            <span className="bw-shimmer-line col-span-2 block h-2.5 rounded-full bg-slate-100" />
            <span className="bw-shimmer-line col-span-2 block h-2.5 rounded-full bg-slate-100" />
            <span className="bw-shimmer-line block h-2.5 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200/70 bg-white/70 px-3 py-2 text-xs leading-5 text-blue-950">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        The draft is generated for your review only — nothing is saved or submitted automatically.
      </p>
    </div>
  );
}

export default AIGeneratingPanel;
