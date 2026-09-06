// BLUEWRITE — Badge Component
// Reusable status/label badge with color variants.

import React from 'react';

const variants = {
  draft: 'bg-slate-100 text-slate-800 ring-slate-300',
  submitted: 'bg-police-blue-100 text-police-blue-700 ring-police-blue-200',
  active: 'bg-green-100 text-green-800 ring-green-200',
  disabled: 'bg-slate-100 text-slate-700 ring-slate-300',
  locked: 'bg-red-100 text-red-800 ring-red-200',
  admin: 'bg-navy-800 text-white ring-navy-700',
  officer: 'bg-police-blue-100 text-police-blue-700 ring-police-blue-200',
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function Badge({ variant = 'default', children }) {
  const classes = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${classes}`}
    >
      {children}
    </span>
  );
}

export default Badge;