// BLUEWRITE — Dashboard Service
// Database-backed dashboard API methods.

import api from './api';

/**
 * Get admin dashboard statistics.
 * Planned: GET /api/dashboard/admin
 */
export async function getAdminDashboard() {
  return api.get('/dashboard/admin');
}

/**
 * Get officer dashboard statistics.
 * Planned: GET /api/dashboard/officer
 */
export async function getOfficerDashboard() {
  return api.get('/dashboard/officer');
}