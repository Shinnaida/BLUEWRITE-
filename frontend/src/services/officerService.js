// BLUEWRITE — Officer Service
// Database-backed Officer management API methods (Admin only).

import api from './api';

/**
 * Get officers list (admin only).
 * Planned: GET /api/officers
 */
export async function getOfficers(params = {}) {
  return api.get('/officers', { params });
}

export async function getOfficer(id) {
  return api.get(`/officers/${id}`);
}

/**
 * Create a new officer (admin only).
 * Planned: POST /api/officers
 */
export async function createOfficer(data) {
  return api.post('/officers', data);
}

/**
 * Update an officer (admin only).
 * Planned: PUT /api/officers/:id
 */
export async function updateOfficer(id, data) {
  return api.put(`/officers/${id}`, data);
}

/**
 * Enable or disable an officer (admin only).
 * Planned: PATCH /api/officers/:id/status
 */
export async function updateOfficerStatus(id, status) {
  return api.patch(`/officers/${id}/status`, { status });
}

export async function unlockOfficer(id) {
  return api.patch(`/officers/${id}/unlock`);
}

export async function resetOfficerPassword(id) {
  return api.post(`/officers/${id}/reset-password`);
}