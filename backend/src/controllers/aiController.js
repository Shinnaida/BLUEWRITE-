const reportService = require('../services/reportService');
const aiService = require('../services/aiService');
const env = require('../config/env');
const { logActivity } = require('../services/logService');
const { success, error } = require('../utils/response');

const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;
const safeAction = (value) => String(value || '').trim().toLowerCase();
const eventTarget = (report) => report.report_number || String(report.id);

const AI_ERROR_MESSAGES = Object.freeze({
  GOOGLE_AI_NOT_CONFIGURED: 'Google AI Studio integration is not configured. Set GEMINI_API_KEY in the backend environment.',
  GOOGLE_AI_AUTHENTICATION_FAILED: 'Google AI Studio rejected the API key. Verify that GEMINI_API_KEY is active and belongs to a project with Gemini API access.',
  GOOGLE_AI_RATE_LIMITED: 'Google AI Studio quota or rate limit was reached. Check the project quota or wait before trying again. Your entered incident information has not been lost.',
  GOOGLE_AI_OVERLOADED: 'Google AI Studio is currently experiencing high demand. Please try again shortly; your entered incident information has not been lost.',
  GOOGLE_AI_INVALID_REQUEST: 'Google AI Studio rejected the configured model or request. Verify GEMINI_MODEL and project model access.',
  GOOGLE_AI_TIMEOUT: 'Google AI Studio did not respond before the request deadline. Please try again; your entered incident information has not been lost.',
  GOOGLE_AI_UNAVAILABLE: 'Google AI Studio could not be reached or is temporarily unavailable. Please try again; your entered incident information has not been lost.',
  GOOGLE_AI_EMPTY_RESPONSE: 'Google AI Studio returned no report text. Please try again; your entered incident information has not been lost.',
});

function safeAIErrorMessage(cause, status) {
  if (AI_ERROR_MESSAGES[cause?.code]) return AI_ERROR_MESSAGES[cause.code];
  if (status >= 500) return 'AI report generation is temporarily unavailable. Your entered incident information has not been lost.';
  return cause?.message || 'Unable to generate the report.';
}

async function authorizedDraft(req, res) {
  if (!validId(req.body?.reportId)) { error(res, 'A valid report ID is required.', 400); return null; }
  const actor = { userId: req.user.id, officerId: req.user.officer.id, role: req.user.role };
  const report = await reportService.getAuthorizedReport(req.body.reportId, actor);
  if (!report) { await reportService.logUnauthorizedReportAccess(req.body.reportId, actor, req).catch(() => {}); error(res, 'Report not found.', 404); return null; }
  if (report.status !== 'Draft') { error(res, 'AI assistance is available only for Draft reports.', 409); return null; }
  return report;
}

exports.assist = async (req, res) => {
  const action = safeAction(req.body?.action);
  if (!aiService.ACTIONS[action]) return error(res, 'Invalid AI assistance action.', 400);
  const writingInstruction = String(req.body?.writingInstruction || '').trim();
  const presetKeys = Array.isArray(req.body?.presetKeys) ? req.body.presetKeys : [];
  let report;
  try {
    report = await authorizedDraft(req, res);
    if (!report) return;
    const result = await aiService.generateReportAssistance({ action, report, formData: req.body?.reportData || {}, writingInstruction, presetKeys });
    const validationCategories = [...new Set([...(result.validation?.issues || []), ...(result.correction?.initialIssues || []), ...(result.structuredFacts?.conflicts || []), ...(result.reportFieldIssues || [])].map((finding) => finding.category))];
    await logActivity({ actorUserId: req.user.id, action: aiService.ACTIONS[action].event, targetType: 'Report', targetId: eventTarget(report), description: `AI ${action} suggestion generated for ${eventTarget(report)}.`, metadata: { aiAction: action, aiProvider: result.aiProvider, aiModel: result.aiModel, outcome: result.reviewReady === false ? 'Validation blocked' : 'Success', instructionType: writingInstruction ? (presetKeys.length ? 'Preset and custom' : 'Custom') : (presetKeys.length ? 'Preset' : 'Default'), presetKeys: result.appliedPresetKeys, factualDifferenceWarning: result.factAnalysis.hasWarning, factualCheckCategories: result.factAnalysis.categories || [], validationCategories, validationConfidence: result.validation?.confidence ?? null, retryCount: result.retryCount || 0, reviewReady: result.reviewReady !== false, autoCorrected: Boolean(result.factAnalysis.autoCorrected) }, ipAddress: req.ip });
    for (const category of validationCategories) {
      await logActivity({ actorUserId: req.user.id, action: category, targetType: 'Report', targetId: eventTarget(report), description: `${category} detected during AI ${action} validation for ${eventTarget(report)}.`, metadata: { aiAction: action, retryCount: result.retryCount || 0, confidence: result.validation?.confidence ?? null }, ipAddress: req.ip });
    }
    if (result.reviewReady === false && !validationCategories.includes('AI_FACT_VALIDATION_FAILED')) await logActivity({ actorUserId: req.user.id, action: 'AI_FACT_VALIDATION_FAILED', targetType: 'Report', targetId: eventTarget(report), description: `AI ${action} draft was blocked from review for ${eventTarget(report)}.`, metadata: { aiAction: action, validationCategories, retryCount: result.retryCount || 0 }, ipAddress: req.ip });
    return success(res, result, 'AI suggestion generated');
  } catch (cause) {
    if (report) await logActivity({ actorUserId: req.user.id, action: cause.code === 'AI_WRITING_REQUEST_REJECTED' ? 'AI_WRITING_REQUEST_REJECTED' : 'AI_REQUEST_FAILED', targetType: 'Report', targetId: eventTarget(report), description: cause.code === 'AI_WRITING_REQUEST_REJECTED' ? `Rejected an out-of-scope AI writing request for ${eventTarget(report)}.` : `AI ${action} request failed for ${eventTarget(report)}.`, metadata: { aiAction: action, aiProvider: 'Google AI Studio', aiModel: env.googleAI.model, outcome: 'Rejected', reason: cause.code || 'AI_ERROR' }, ipAddress: req.ip }).catch(() => {});
    const status = cause.status || (cause.code === 'AI_INVALID_RESPONSE' ? 502 : 503);
    const message = safeAIErrorMessage(cause, status);
    return error(res, message, status);
  }
};

exports.safeAIErrorMessage = safeAIErrorMessage;

// Guided Q&A field extraction. Authorization is by officer session (no reportId
// required — extraction happens before a report exists), and the officer message is
// structured without any write to the database.
exports.extract = async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const knownFields = req.body?.knownFields || {};
  if (!message) return error(res, 'A message is required.', 400);
  if (message.length > 4000) return error(res, 'Message is too long.', 400);
  try {
    const result = await aiService.extractReportFields({ message, knownFields, currentDate: req.body?.currentDate });
    await logActivity({ actorUserId: req.user.id, action: aiService.ACTIONS.extract.event, targetType: 'Report', targetId: 'UNSAVED_REPORT', description: `AI structured an Officer answer into report fields during guided report creation.`, metadata: { aiAction: 'extract', aiProvider: result.aiProvider, aiModel: result.aiModel, outcome: Object.keys(result.extracted).length ? 'Success' : 'No fields recognized', verificationIssues: result.issues }, ipAddress: req.ip }).catch(() => {});
    return success(res, result, 'AI field extraction complete');
  } catch (cause) {
    // Rate-limited/unavailable — the frontend falls back to local parsing, which
    // is logged separately by the local-extraction endpoint when used.
    await logActivity({ actorUserId: req.user.id, action: cause.code === 'AI_WRITING_REQUEST_REJECTED' ? 'AI_WRITING_REQUEST_REJECTED' : 'AI_REQUEST_FAILED', targetType: 'Report', targetId: 'UNSAVED_REPORT', description: `AI field extraction request failed during guided report creation.`, metadata: { aiAction: 'extract', aiProvider: 'Google AI Studio', aiModel: env.googleAI.model, outcome: 'Rejected', reason: cause.code || 'AI_ERROR' }, ipAddress: req.ip }).catch(() => {});
    const status = cause.status || 503;
    return error(res, safeAIErrorMessage(cause, status), status);
  }
};

exports.accept = async (req, res) => {
  const action = safeAction(req.body?.action);
  if (!['generate', 'improve'].includes(action)) return error(res, 'Invalid AI suggestion action.', 400);
  const decision = req.body?.decision === 'rejected' ? 'rejected' : 'accepted';
  try {
    const report = await authorizedDraft(req, res);
    if (!report) return;
    await logActivity({ actorUserId: req.user.id, action: decision === 'accepted' ? 'AI_SUGGESTION_ACCEPTED' : 'AI_SUGGESTION_REJECTED', targetType: 'Report', targetId: eventTarget(report), description: `Officer ${decision} an AI ${action} suggestion for ${eventTarget(report)}.`, metadata: { aiAction: action, decision, factualDifferenceWarning: Boolean(req.body?.factualDifferenceWarning) }, ipAddress: req.ip });
    return success(res, { recorded: true }, `AI suggestion ${decision} decision recorded`);
  } catch {
    return error(res, 'Unable to record AI suggestion acceptance.', 500);
  }
};