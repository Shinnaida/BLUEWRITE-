// BLUEWRITE — AIAssistant Component
// BLUEWRITE AI Assistant panel with placeholder analysis (Phase 1.3).
// AI functionality is NOT implemented — this is a UI demonstration.

import React from 'react';
import { Sparkles, FileText, SearchCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import {
  AI_ASSISTANT_NAME,
  AI_ASSISTANT_SUBTITLE,
  AI_ASSISTANT_NOTICE,
} from '../../utils/constants';
import { mockAIAnalysis } from '../../utils/mockData';

function AIAssistant({ onGenerateReport, onAnalyzeReport, disabled = false }) {
  const analysis = mockAIAnalysis;

  return (
    <div className="rounded-xl border border-police-blue-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-police-blue-700 text-white shadow-sm">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-950">{AI_ASSISTANT_NAME}</h3>
          <p className="text-xs font-semibold text-slate-600">{AI_ASSISTANT_SUBTITLE}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="secondary"
          onClick={onGenerateReport}
          disabled={disabled}
          className="w-full"
        >
          <FileText size={16} className="mr-2" />
          Generate Report
        </Button>
        <Button
          variant="secondary"
          onClick={onAnalyzeReport}
          disabled={disabled}
          className="w-full"
        >
          <SearchCheck size={16} className="mr-2" />
          Analyze Report
        </Button>
      </div>

      {/* Placeholder analysis */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Report Readiness</p>
          <span className="text-lg font-bold text-police-blue-700">{analysis.readiness}%</span>
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-police-blue-600"
            style={{ width: `${analysis.readiness}%` }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Grammar</span>
            <span className="flex items-center gap-1 text-sm font-medium text-green-700">
              <CheckCircle2 size={14} />
              {analysis.grammar.label}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Completeness</span>
            <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
              <AlertTriangle size={14} />
              {analysis.completeness.label}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-slate-800">Suggestions</p>
          <ul className="list-inside list-disc space-y-1 text-sm font-medium leading-6 text-slate-700">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Notice */}
      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
        {AI_ASSISTANT_NOTICE}
      </p>
    </div>
  );
}

export default AIAssistant;