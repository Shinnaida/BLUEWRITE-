// BLUEWRITE — Report Service
// Database-backed report API methods used by Officer and Admin pages.

import api from './api';

/**
 * Get reports (officer: own only; admin: all).
 * Planned: GET /api/reports
 */
export async function getReports(params = {}) {
  return api.get('/reports', { params });
}

/**
 * Get a single report.
 * Planned: GET /api/reports/:id
 */
export async function getReport(id) {
  return api.get(`/reports/${id}`);
}

/**
 * Create a new draft report.
 * Planned: POST /api/reports
 */
export async function createReport(data) {
  return api.post('/reports', data);
}

/**
 * Update a draft report.
 * Planned: PUT /api/reports/:id
 */
export async function updateReport(id, data) {
  return api.put(`/reports/${id}`, data);
}

/**
 * Submit a draft report.
 * Planned: PATCH /api/reports/:id/submit
 */
export async function submitReport(id) {
  return api.patch(`/reports/${id}/submit`);
}

export async function recordReportPrint(id) {
  return api.post(`/reports/${id}/print`);
}