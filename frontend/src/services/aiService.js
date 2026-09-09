import api from './api';

// Local generation on CPU takes 2-3 minutes with the 1.5B model; a generate
// request can also add one corrective retry (capped at 45s server-side). This
// must stay ABOVE the backend's worst case (OLLAMA_GENERATE_TIMEOUT_MS + 45s)
// so the backend's precise error message reaches the UI instead of the browser
// aborting first.
const AI_REQUEST_TIMEOUT_MS = 300000;

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