// BLUEWRITE — TimePicker Component
// HH:MM numeric inputs in one bordered container with a static colon separator,
// up/down steppers (Shift = 5-minute steps), an AM/PM segmented toggle, and
// quick-action chips: Set to now / Round to :00 / Round to :30.
// Always commits a 24-hour HH:MM value (the backend format). No dial, no
// external dependencies — plain inputs and buttons.

import React from 'react';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20';

function TimePicker({ value, onChange, disabled = false, ariaLabel = 'Time of day' }) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  const h24 = match ? parseInt(match[1], 10) : null;
  const minute = match ? parseInt(match[2], 10) : null;
  const period = h24 === null ? 'AM' : (h24 >= 12 ? 'PM' : 'AM');
  const hour12 = h24 === null ? null : (h24 % 12 === 0 ? 12 : h24 % 12);

  // Store the transiently typed values so the officer can type the hour before
  // the minute is known; commit only valid full values upward.
  const [hourDraft, setHourDraft] = React.useState(null);
  const [minuteDraft, setMinuteDraft] = React.useState(null);
  React.useEffect(() => { setHourDraft(null); setMinuteDraft(null); }, [value]);

  const commit = (nextHour12, nextMinute) => {
    const hh = ((nextHour12 ?? hour12 ?? 12) % 12) + (period === 'PM' ? 12 : 0);
    onChange(`${String(hh).padStart(2, '0')}:${String(nextMinute ?? minute ?? 0).padStart(2, '0')}`);
  };

  const setPeriod = (p) => {
    const base12 = hour12 ?? 12;
    const hh = (base12 % 12) + (p === 'PM' ? 12 : 0);
    onChange(`${String(hh).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`);
  };

  // Shift+click or Shift+Arrow = 5-minute steps, otherwise 1 minute.
  const stepMinutes = (delta, large) => {
    const step = large ? 5 : 1;
    const base = minute ?? 0;
    commit(hour12 ?? 12, ((base + delta * step) % 60 + 60) % 60);
  };

  const bumpHour = (delta) => {
    const base = hour12 ?? 12;
    commit(((base - 1 + delta + 12) % 12) + 1, minute ?? 0);
  };

  const setToNow = () => {
    const now = new Date();
    const hh = now.getHours();
    onChange(`${String(hh).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  // Round the currently entered minute to the nearest boundary without
  // clearing the hour. Empty time rounds from the current clock minute.
  const roundTo = (boundary) => {
    const baseMinute = minute ?? new Date().getMinutes();
    const hourBase = hour12 ?? new Date().getHours();
    if (boundary === 0) commit(hourBase % 12 === 0 ? 12 : hourBase % 12, 0);
    else commit(hourBase % 12 === 0 ? 12 : hourBase % 12, 30);
  };

  const hourKeyDown = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bumpHour(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); bumpHour(-1); }
  };
  const minuteKeyDown = (e) => {
    const large = e.shiftKey;
    if (e.key === 'ArrowUp') { e.preventDefault(); stepMinutes(1, large); }
    if (e.key === 'ArrowDown') { e.preventDefault(); stepMinutes(-1, large); }
  };
  const stepperKeyDown = (e) => (handler) => {
    if (e.shiftKey) e.currentTarget.dataset.shift = '1';
    handler(e);
  };

  const hourValue = hourDraft ?? (hour12 !== null ? String(hour12).padStart(2, '0') : '');
  const minuteValue = minuteDraft ?? (minute !== null ? String(minute).padStart(2, '0') : '');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5" role="group" aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center gap-2">
        {/* HH:MM field container — one bordered box, colon separator, steppers on the right edge */}
        <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-300 focus-within:border-police-blue-600 focus-within:ring-2 focus-within:ring-police-blue-600/20">
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={hourValue}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
              setHourDraft(digits === '' ? null : digits);
              const n = parseInt(digits, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 12) commit(n, undefined);
              if (digits.length === 2 && !Number.isNaN(n) && n >= 1 && n <= 12) setHourDraft(null);
            }}
            onBlur={() => setHourDraft(null)}
            onKeyDown={hourKeyDown}
            aria-label={`${ariaLabel} hour`}
            placeholder="HH"
            className="w-[52px] border-0 bg-slate-50 px-1.5 py-2 text-center text-[20px] font-extrabold tabular-nums leading-none text-slate-900 placeholder-slate-300 outline-none disabled:cursor-not-allowed"
          />
          <span className="flex items-center bg-slate-50 px-0.5 text-[20px] font-extrabold leading-none text-slate-400" aria-hidden="true">:</span>
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={minuteValue}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
              setMinuteDraft(digits === '' ? null : digits);
              const n = parseInt(digits, 10);
              if (!Number.isNaN(n) && n <= 59) commit(undefined, n);
              if (digits.length === 2 && !Number.isNaN(n) && n <= 59) setMinuteDraft(null);
            }}
            onBlur={() => setMinuteDraft(null)}
            onKeyDown={minuteKeyDown}
            aria-label={`${ariaLabel} minutes`}
            placeholder="MM"
            className="w-[52px] border-0 bg-slate-50 px-1.5 py-2 text-center text-[20px] font-extrabold tabular-nums leading-none text-slate-900 placeholder-slate-300 outline-none disabled:cursor-not-allowed"
          />
          {/* Steppers — right edge of the container. Click = 1 minute; Shift+click = 5 minutes. */}
          <div className="flex flex-col border-l border-slate-200">
            <button
              type="button" tabIndex={-1} disabled={disabled}
              onClick={(e) => (minuteDraft !== null || minute !== null ? stepMinutes(e.shiftKey ? 5 : 1, e.shiftKey) : bumpHour(1))}
              aria-label="Increase time"
              className="flex flex-1 items-center justify-center px-1.5 text-slate-500 transition hover:bg-police-blue-100 hover:text-police-blue-700 disabled:cursor-not-allowed"
            >
              ▲
            </button>
            <button
              type="button" tabIndex={-1} disabled={disabled}
              onClick={(e) => (minuteDraft !== null || minute !== null ? stepMinutes(e.shiftKey ? -5 : -1, e.shiftKey) : bumpHour(-1))}
              aria-label="Decrease time"
              className="flex flex-1 items-center justify-center border-t border-slate-200 px-1.5 text-slate-500 transition hover:bg-police-blue-100 hover:text-police-blue-700 disabled:cursor-not-allowed"
            >
              ▼
            </button>
          </div>
        </div>

        {/* AM/PM segmented toggle */}
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label="AM or PM">
          {['AM', 'PM'].map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              disabled={disabled}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-[12px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-police-blue-600/60 disabled:cursor-not-allowed ${period === p ? 'bg-police-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'} ${p === 'AM' ? 'border-r border-slate-300' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {[
          { label: 'Set to now', action: setToNow },
          { label: 'Round to :00', action: () => roundTo(0) },
          { label: 'Round to :30', action: () => roundTo(30) },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={disabled}
            onClick={chip.action}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11.5px] font-medium text-slate-700 transition hover:border-police-blue-500 hover:bg-police-blue-100/60 hover:text-police-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-slate-500" aria-live="polite">
        Type directly, or use the arrows to adjust by 1 minute. Hold Shift for 5-minute steps.
        {h24 !== null && <span className="ml-1 font-semibold text-slate-600">· Saves as {String(h24).padStart(2, '0')}:{String(minute ?? 0).padStart(2, '0')}</span>}
      </p>
    </div>
  );
}

export default TimePicker;
