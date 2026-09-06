import api from './api';
export const getActivityLogs=(params={})=>api.get('/activity-logs',{params});
export const getActivityLog=(id)=>api.get(`/activity-logs/${id}`);