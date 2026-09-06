// BLUEWRITE — StatCard Component
// Reusable dashboard statistic card with icon, value, and label.

import React from 'react';

function StatCard({ icon: Icon, label, value, color = 'police-blue', description = 'Records in current view' }) {
  const colorClasses = {
    'police-blue': 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-green-100 text-green-700 ring-green-200',
    amber: 'bg-slate-100 text-slate-700 ring-slate-200',
    gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${colorClasses[color] || colorClasses['police-blue']}`}
        >
          {Icon && <Icon size={24} />}
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default StatCard;