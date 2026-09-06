// BLUEWRITE — TimePicker Component
// Compact type-in time picker: two numeric fields (hour : minute) with spinner
// up/down arrows plus an AM/PM toggle. The officer just types the time —
// no dial. Always commits a 24-hour HH:MM value (the backend format).

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

function TimePicker({ value, onChange, disabled = false, ariaLabel = 'Time of day' }) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  const h24 = match ? parseInt(match[1], 10) : null;
  const minute = match ? parseInt(match[2], 10) : null;
  const period = h24 === null ? 'am' : (h24 >= 12 ? 'pm' : 'am');
  const hour12 = h24 === null ? null : (h24 % 12 === 0 ? 12 : h24 % 12);

  const commit = (nextHour12, nextMinute) => {
    const hh = (nextHour12 % 12) + (period === 'pm' ? 12 : 0);
    onChange(`${String(hh).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  };

  const setPeriod = (p) => {
    if (hour12 === null) return;
    const hh = (hour12 % 12) + (p === 'pm' ? 12 : 0);
    onChange(`${String(hh).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`);
  };

  const bumpHour = (delta) => {
    const base = hour12 ?? 12;
    const next = ((base - 1 + delta + 12) % 12) + 1;
    commit(next, minute ?? 0);
  };

  const bumpMinute = (delta) => {
    const base = minute ?? 0;
    const next = ((base + delta) % 60 + 60) % 60;
    commit(hour12 ?? 12, next);
  };

  // Numeric segment: typeable box with stacked spinner arrows on the right.
  const segment = ({ shown, max, onInput, onStep, ariaText, active, onFocus }) => {
    const [draft, setDraft] = React.useState(null); // transient typing buffer

    React.useEffect(() => { setDraft(null); }, [shown]);

    const commitDraft = (raw) => {
      const digits = raw.replace(/\D/g, '').slice(0, 2);
      setDraft(digits === '' ? null : digits);
      if (digits === '') return;
      const n = parseInt(digits, 10);
      if (Number.isNaN(n) || n > max) return;
      onInput(n);
      if (digits.length === 2) setDraft(null); // full entry → show formatted again
    };

    return (
      <div className={`flex items-stretch overflow-hidden rounded-lg border transition ${active ? 'border-police-blue-500 ring-2 ring-police-blue-600/20' : 'border-slate-300'}`}>
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={draft ?? shown}
          onFocus={onFocus}
          onChange={(e) => commitDraft(e.target.value)}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1); }
          }}
          aria-label={ariaText}
          placeholder="--"
          className="w-[46px] bg-slate-50 px-1.5 py-1.5 text-center text-[20px] font-extrabold tabular-nums leading-none text-slate-900 placeholder-slate-300 outline-none disabled:cursor-not-allowed"
        />
        <div className="flex flex-col border-l border-slate-200">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => onStep(1)}
            aria-label={`Increase ${ariaText}`}
            className="flex flex-1 items-center justify-center px-1 text-slate-500 transition hover:bg-police-blue-100 hover:text-police-blue-700 disabled:cursor-not-allowed"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => onStep(-1)}
            aria-label={`Decrease ${ariaText}`}
            className="flex flex-1 items-center justify-center border-t border-slate-200 px-1 text-slate-500 transition hover:bg-police-blue-100 hover:text-police-blue-700 disabled:cursor-not-allowed"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5" role="group" aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {segment({
          shown: hour12 !== null ? String(hour12).padStart(2, '0') : '--',
          max: 12,
          onInput: (n) => commit(n, minute ?? 0),
          onStep: bumpHour,
          ariaText: 'hour',
          active: true,
          onFocus: () => {},
        })}

        <span className="text-[20px] font-extrabold leading-none text-slate-400" aria-hidden="true">:</span>

        {segment({
          shown: minute !== null ? String(minute).padStart(2, '0') : '--',
          max: 59,
          onInput: (n) => commit(hour12 ?? 12, n),
          onStep: bumpMinute,
          ariaText: 'minute',
          active: true,
          onFocus: () => {},
        })}

        {/* AM/PM toggle */}
        <div className="ml-0.5 inline-flex flex-col overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label="AM or PM">
          {['am', 'pm'].map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              disabled={disabled}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-0.5 text-[11.5px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-police-blue-600/60 disabled:cursor-not-allowed ${period === p ? 'bg-police-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'} ${p === 'am' ? 'border-b border-slate-300' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11.5px] text-slate-500" aria-live="polite">
        Type the time, or use the arrows · 12-hour
        {h24 !== null && (
          <span className="ml-1 font-semibold text-slate-600">· Saves as {String(h24).padStart(2, '0')}:{String(minute ?? 0).padStart(2, '0')}</span>
        )}
      </p>
    </div>
  );
}

export default TimePicker;
