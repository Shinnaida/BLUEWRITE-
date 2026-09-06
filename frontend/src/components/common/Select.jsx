// BLUEWRITE — Select Component
// Reusable dropdown select with label, options, and error states.

import React from 'react';
import { ChevronDown } from 'lucide-react';

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error = '',
  required = false,
  disabled = false,
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
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full cursor-pointer appearance-none rounded-lg border bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
          <ChevronDown size={16} />
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Select;