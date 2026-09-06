import { mockActivityLogs } from './mockData';

export const ACTIVITY_LOG_STORAGE_KEY = 'bluewrite_activity_logs';

export function getActivityLogs() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY) || '[]');
    return [...saved, ...mockActivityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [...mockActivityLogs];
  }
}

export function logActivity(entry) {
  const log = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    metadata: {},
    ...entry,
  };
  try {
    const saved = JSON.parse(window.localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY) || '[]');
    window.localStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify([log, ...saved].slice(0, 100)));
    window.dispatchEvent(new CustomEvent('bluewrite:activity-logged', { detail: log }));
  } catch { /* Demo logging must never block the primary action. */ }
  return log;
}