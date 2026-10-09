// Slot start times (hours, IST) and a simple hourly crowd-demand model
const SL = [5.5, 6.5, 7.5, 8.5, 9.5, 11, 14, 16.5, 18, 19.5];
const D = { 5: .35, 6: .3, 7: .4, 8: .55, 9: .85, 10: 1, 11: .95, 12: .8, 13: .6, 14: .5, 15: .55, 16: .65, 17: .8, 18: .9, 19: .7, 20: .45 };
const LOCAL_PIN = /^4560(0[1-9]|10)$/; // Ujjain: 456001-456010
const IST_MS = 5.5 * 3600e3;

const istNow = () => new Date(Date.now() + IST_MS);
const todayISO = () => istNow().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nowMinutes = () => { const d = istNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const slotStart = (date, i) => new Date(new Date(date + 'T00:00:00+05:30').getTime() + SL[i] * 3600e3);

const tm = h => { const H = Math.floor(h), M = h % 1 ? '30' : '00'; return (H % 12 || 12) + ':' + M + (H < 12 ? ' AM' : ' PM'); };
const hm = m => m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + ' min';
const dayLabel = date => {
  const t = todayISO();
  if (date === t) return 'Today';
  if (date === addDays(t, 1)) return 'Tomorrow';
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const demand = h => D[Math.floor(h)] || .3;
const generalWait = (h, f = 1) => Math.round(demand(h) * f * 260);
const localWait = h => Math.round(12 + demand(h) * 35);
const level = m => (m < 90 ? 'Low' : m < 180 ? 'Medium' : 'High');
// places already taken by other devotees (simulated baseline) for a date + slot
const seededTaken = (date, i) => ([...date].reduce((a, c) => a + c.charCodeAt(0), i * 7) % 7) + 3 + (demand(SL[i]) > .8 ? 3 : 0);

// Trust score: +30 verified local, +5 per completed check-in (max 10), +2 per weekly streak (max 6), -10 no-show, -4 late cancel
const score = u => Math.max(0, Math.min(100, (u.local ? 30 : 0) + Math.min(u.done, 10) * 5 + Math.min(u.streak, 6) * 2 - u.ns * 10 - u.lc * 4));
const tier = s => (s >= 80 ? 'Trusted devotee' : s >= 60 ? 'Regular devotee' : 'Building trust');
const eligible = u => u.local && score(u) >= 60;

// Deterministic "live" queue so every client sees the same number
const liveQueue = () => { const t = Date.now() / 1000; return Math.round(1284 + Math.sin(t / 37) * 90 + Math.sin(t / 11) * 25); };

module.exports = { SL, D, LOCAL_PIN, istNow, todayISO, addDays, nowMinutes, slotStart, tm, hm, dayLabel, demand, generalWait, localWait, level, seededTaken, score, tier, eligible, liveQueue };
