// BLUEWRITE — Input Component
// Reusable text input with label, error, and focus states.

import React from 'react';

function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onPaste,
  placeholder = '',
  error = '',
  required = false,
  disabled = false,
  className = '',
  icon: Icon = null,
  ...props
}) {
  const iconElement = React.isValidElement(Icon) ? Icon : Icon ? <Icon size={16} /> : null;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-800">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        {iconElement && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
            {iconElement}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onPaste={onPaste}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-500 shadow-sm focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
            iconElement ? 'pl-9' : ''
          } ${error ? 'border-red-500' : 'border-slate-300'}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Input;