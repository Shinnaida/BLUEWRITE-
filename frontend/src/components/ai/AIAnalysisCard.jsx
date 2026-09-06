// BLUEWRITE — AIAnalysisCard Component
// Displays BLUEWRITE AI Assistant analysis results (placeholder, Phase 1.3).

import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { mockAIAnalysis } from '../../utils/mockData';

function AIAnalysisCard({ analysis = null }) {
  const data = analysis || mockAIAnalysis;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-police-blue-100 text-police-blue-700 ring-1 ring-police-blue-200">
          <Sparkles size={18} />
        </div>
        <h3 className="font-bold text-slate-950">AI Analysis</h3>
      </div>

      {/* Readiness */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">Report Readiness</p>
        <span className="text-lg font-bold text-police-blue-700">{data.readiness}%</span>
      </div>
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-police-blue-600"
          style={{ width: `${data.readiness}%` }}
        />
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm font-semibold text-slate-700">Grammar</span>
          <span className="flex items-center gap-1 text-sm font-medium text-green-700">
            <CheckCircle2 size={14} />
            {data.grammar.label}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm font-semibold text-slate-700">Completeness</span>
          <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
            <AlertTriangle size={14} />
            {data.completeness.label}
          </span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="mt-4">
        <p className="mb-2 text-sm font-bold text-slate-800">Suggestions</p>
        <ul className="list-inside list-disc space-y-1 text-sm font-medium leading-6 text-slate-700">
          {data.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
        The AI provides writing assistance and suggestions only. The reporting officer remains
        responsible for the final report.
      </p>
    </div>
  );
}

export default AIAnalysisCard;