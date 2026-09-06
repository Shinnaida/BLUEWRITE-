import api from './api';

export async function login(credentials) {
  return api.post('/auth/login', credentials);
}

export async function getEmailVerificationStatus() { return api.get('/auth/verify-email/status'); }
export async function verifyEmailCode(code) { return api.post('/auth/verify-email', { code }); }
export async function resendEmailVerification() { return api.post('/auth/verify-email/resend'); }
export async function cancelEmailVerification() { return api.post('/auth/verify-email/cancel'); }

export async function getMe() {
  return api.get('/auth/me');
}

export async function logout() {
  return api.post('/auth/logout');
}

export async function changePassword(passwords) {
  return api.post('/auth/change-password', passwords);
}

export async function getSecurityReview() {
  return api.get('/auth/security-review');
}

export async function completeSecurityReview(decision) {
  return api.post('/auth/security-review', { decision });
}