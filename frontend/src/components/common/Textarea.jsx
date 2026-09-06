// BLUEWRITE — Textarea Component
// Reusable multi-line textarea with label, error, and focus states.

import React from 'react';

function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-800">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium leading-6 text-slate-900 placeholder-slate-500 shadow-sm focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Textarea;