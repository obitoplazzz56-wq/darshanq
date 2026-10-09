const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
let token = localStorage.getItem('dq_token');

export const setToken = t => { token = t; t ? localStorage.setItem('dq_token', t) : localStorage.removeItem('dq_token'); };
export const hasToken = () => !!token;

async function req(path, { method = 'GET', body, blob } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (blob && r.ok) return r.blob();
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'Something went wrong. Please try again.'); e.code = d.code; e.status = r.status; throw e; }
  return d;
}
const post = (p, body = {}) => req(p, { method: 'POST', body });

export const api = {
  sendOtp: b => post('/auth/send-otp', b),
  verify: b => post('/auth/verify', b),
  me: () => req('/me'),
  setPrefs: b => req('/me/prefs', { method: 'PUT', body: b }),
  deleteMe: () => req('/me', { method: 'DELETE' }),
  config: () => req('/config'),
  crowd: f => req('/crowd?festival=' + (f ? 1 : 0)),
  slots: (day, f) => req(`/slots?day=${day}&festival=${f ? 1 : 0}`),
  bookings: () => req('/bookings'),
  book: b => post('/bookings', b),
  cancel: id => post(`/bookings/${id}/cancel`),
  reschedule: id => post(`/bookings/${id}/reschedule`),
  checkin: (id, simulate) => post(`/bookings/${id}/checkin`, { simulate }),
  report: minutes => post('/reports', { minutes }),
  dashboard: () => req('/admin/dashboard'),
  setConfig: b => req('/admin/config', { method: 'PUT', body: b }),
  noShow: id => post(`/admin/bookings/${id}/noshow`),
  exportCsv: () => req('/admin/export', { blob: true }),
};
