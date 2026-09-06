import api from './api';

// Covers the primary Google AI Studio request and the single bounded correction pass.
const AI_REQUEST_TIMEOUT_MS = 150000;

export async function requestReportAssistance({ action, reportId, reportData, writingInstruction, presetKeys }) {
  return api.post(
    '/ai/report-assist',
    { action, reportId, reportData, writingInstruction, presetKeys },
    { timeout: AI_REQUEST_TIMEOUT_MS }
  );
}

export async function recordSuggestionDecision({ action, reportId, decision, factualDifferenceWarning }) {
  return api.post('/ai/report-assist/accepted', { action, reportId, decision, factualDifferenceWarning });
}

// Guided Q&A: structures an officer chat answer into report fields.
// The backend verifies every returned value is supported by the message itself.
export async function extractReportFields({ message, knownFields, currentDate }) {
  return api.post('/ai/report-assist/extract', { message, knownFields, currentDate });
}