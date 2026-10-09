// Time helpers (IST), formatting, crowd model and trust-score maths. Temple-specific data lives in temples.js.
const IST_MS = 5.5 * 3600e3;

const istNow = () => new Date(Date.now() + IST_MS);
const todayISO = () => istNow().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nowMinutes = () => { const d = istNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const slotStart = (t, date, i) => new Date(new Date(date + 'T00:00:00+05:30').getTime() + t.slots[i] * 3600e3);

const tm = h => { const H = Math.floor(h), M = h % 1 ? '30' : '00'; return (H % 12 || 12) + ':' + M + (H < 12 ? ' AM' : ' PM'); };
const hm = m => m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + ' min';
const dayLabel = date => {
  const t = todayISO();
  if (date === t) return 'Today';
  if (date === addDays(t, 1)) return 'Tomorrow';
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const isLocal = (pincode, t) => t.pins.includes(String(pincode));
const demand = (t, h) => t.demand[Math.floor(h)] || .3;
const generalWait = (t, h, f = 1) => Math.round(demand(t, h) * f * 260);
const localWait = (t, h) => Math.round(12 + demand(t, h) * 35);
const level = m => (m < 90 ? 'Low' : m < 180 ? 'Medium' : 'High');
// places already taken by other devotees (simulated baseline) for a temple/date/slot
const seededTaken = (t, date, i) => ([...(t.id + date)].reduce((a, c) => a + c.charCodeAt(0), i * 7) % 7) + 3 + (demand(t, t.slots[i]) > .8 ? 3 : 0);

// Trust score: +30 verified local, +5 per completed check-in (max 10), +2 per weekly streak (max 6), -10 no-show, -4 late cancel
const score = (s, local) => Math.max(0, Math.min(100, (local ? 30 : 0) + Math.min(s.done, 10) * 5 + Math.min(s.streak, 6) * 2 - s.ns * 10 - s.lc * 4));
const tier = s => (s >= 80 ? 'Trusted devotee' : s >= 60 ? 'Regular devotee' : 'Building trust');

// Deterministic "live" queue so every client sees the same number
const liveQueue = t => {
  const s = t.id.length, x = Date.now() / 1000;
  return Math.round(t.baseQueue * (1 + Math.sin(x / 37 + s) * .07 + Math.sin(x / 11 + s) * .02));
};

module.exports = { istNow, todayISO, addDays, nowMinutes, slotStart, tm, hm, dayLabel, isLocal, demand, generalWait, localWait, level, seededTaken, score, tier, liveQueue };
