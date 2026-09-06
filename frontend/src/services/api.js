// BLUEWRITE — Axios API Client
// Configures the shared Axios instance for all API requests.

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    if (status === 401 && !url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('bluewrite:session-expired'));
      if (!['/login','/verify-email'].includes(window.location.pathname)) window.location.assign('/login?expired=1');
    }
    if (status === 403 && !error.response?.data?.message) error.response.data = { success: false, message: 'You do not have permission to perform this action.' };
    return Promise.reject(error);
  }
);

export default api;