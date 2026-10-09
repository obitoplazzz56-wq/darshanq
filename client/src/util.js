export const hm = m => (m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + ' min');
export const pc = l => (l === 'Low' ? '' : l === 'Medium' ? 'w' : 'b');
// same formula as the server (used by the landing-page calculator only)
export const calcScore = (c, st, ns, lc = 0) => Math.max(0, Math.min(100, 30 + Math.min(c, 10) * 5 + Math.min(st, 6) * 2 - ns * 10 - lc * 4));
export const tierOf = s => (s >= 80 ? 'Trusted devotee' : s >= 60 ? 'Regular devotee' : 'Building trust');
export const stamp = d => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
