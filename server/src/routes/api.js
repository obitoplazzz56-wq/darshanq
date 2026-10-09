const router = require('express').Router();
const { User, Standing, Booking, Report } = require('../models');
const { auth, temple } = require('../middleware');
const { TEMPLES, BY_ID, publicView } = require('../temples');
const U = require('../utils');
const S = require('../services');

/* ---------- public ---------- */
router.get('/temples', (req, res) => res.json(TEMPLES.map(publicView)));

router.get('/config', temple, async (req, res) => {
  const c = await S.getConfig(req.temple);
  res.json({ paused: c.paused, cap: c.cap, announcement: c.announcement });
});

router.get('/crowd', temple, async (req, res) => {
  const t = req.temple, f = req.query.festival === '1' ? 1.5 : 1;
  const queue = U.liveQueue(t);
  let wait = Math.round(queue * .173);
  const since = new Date(Date.now() - 24 * 3600e3);
  const reps = await Report.find({ temple: t.id, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(50).select('minutes');
  const avg = reps.length ? Math.round(reps.reduce((a, r) => a + r.minutes, 0) / reps.length) : null;
  if (avg !== null) wait = Math.round(wait * .6 + avg * .4);
  const forecast = Object.keys(t.demand).map(Number).map(h => ({ hour: h, label: U.tm(h), wait: U.generalWait(t, h, f) }));
  res.json({ queue, generalWait: wait, localWait: Math.round(15 + wait * .08), avgReported: avg, reports: reps.length, forecast });
});

/* ---------- authenticated ---------- */
router.use(auth);

router.get('/me', temple, async (req, res) => {
  res.json(S.userView(req.user, await S.getStanding(req.user, req.temple), req.temple));
});

router.put('/me/prefs', temple, async (req, res) => {
  const { sms, wa } = req.body || {};
  if (typeof sms === 'boolean') req.user.prefs.sms = sms;
  if (typeof wa === 'boolean') req.user.prefs.wa = wa;
  await req.user.save();
  res.json(S.userView(req.user, await S.getStanding(req.user, req.temple), req.temple));
});

// Reset demo data: removes this account, its bookings and its temple records
router.delete('/me', async (req, res) => {
  await Booking.deleteMany({ user: req.user._id });
  await Standing.deleteMany({ user: req.user._id });
  await User.deleteOne({ _id: req.user._id });
  res.json({ ok: true });
});

router.get('/slots', temple, async (req, res) => {
  const t = req.temple;
  const day = Math.min(2, Math.max(0, parseInt(req.query.day, 10) || 0));
  const f = req.query.festival === '1' ? 1.5 : 1;
  const today = U.todayISO(), date = U.addDays(today, day);
  const cfg = await S.getConfig(t), used = await S.usedByDate(t, date), nowMin = U.nowMinutes();
  res.json({
    date,
    days: [0, 1, 2].map(n => ({ day: n, label: U.dayLabel(U.addDays(today, n)) })),
    slots: t.slots.map((h, i) => {
      const w = U.generalWait(t, h, f);
      return {
        slot: i, time: U.tm(h), crowd: U.level(w), generalWait: w, localWait: U.localWait(t, h),
        left: Math.max(0, S.placesLeft(t, cfg.cap, date, i, used)),
        passed: day === 0 && h * 60 < nowMin + 30,
      };
    }),
  });
});

// all of this devotee's passes, across every temple
router.get('/bookings', async (req, res) => {
  const list = await Booking.find({ user: req.user._id }).sort({ date: -1, slot: -1 }).limit(100);
  res.json(list.filter(b => BY_ID[b.temple]).map(S.bookingView));
});

router.post('/bookings', temple, async (req, res) => {
  const u = req.user, t = req.temple, cfg = await S.getConfig(t);
  if (cfg.paused) return res.status(403).json({ error: `The free lane at ${t.name} is paused by the temple.` });
  const st = await S.getStanding(u, t), me = S.userView(u, st, t);
  if (!me.eligible) return res.status(403).json({ error: `The free lane is locked. You need to be a verified ${t.city} local (pincode) with a trust score of 60 or more at ${t.name}.` });

  const { date, slot, party = 1, assist = false } = req.body || {};
  const i = Number(slot), g = Number(party);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !Number.isInteger(i) || i < 0 || i >= t.slots.length || !Number.isInteger(g) || g < 1 || g > 4)
    return res.status(400).json({ error: 'Invalid booking details.' });
  const today = U.todayISO();
  if (date < today || date > U.addDays(today, 2)) return res.status(400).json({ error: 'You can book from today up to 2 days ahead.' });
  if (date === today && t.slots[i] * 60 < U.nowMinutes() + 30) return res.status(400).json({ error: 'That slot has already passed.' });
  if (await Booking.exists({ user: u._id, temple: t.id, date, status: 'booked' }))
    return res.status(409).json({ error: `You already have a booking at ${t.name} that day. Cancel it first to change slots.` });

  const left = S.placesLeft(t, cfg.cap, date, i, await S.usedByDate(t, date));
  if (left < g) return res.status(409).json({ error: `Only ${Math.max(0, left)} places left in this slot. Reduce the party size or pick another slot.` });

  const b = await Booking.create({ code: S.newCode(), user: u._id, temple: t.id, date, slot: i, party: g, assist: !!assist });
  S.addLog(st, `Reserved ${U.tm(t.slots[i])} for ${g}`);
  await st.save();
  res.status(201).json(S.bookingView(b));
});

// loads an active booking owned by this user, plus the temple and the user's record there
const mine = async (req, res) => {
  const b = await Booking.findOne({ code: req.params.id, user: req.user._id });
  if (!b || !BY_ID[b.temple]) { res.status(404).json({ error: 'Booking not found.' }); return null; }
  if (b.status !== 'booked') { res.status(400).json({ error: 'This booking is no longer active.' }); return null; }
  const t = BY_ID[b.temple];
  return { b, t, st: await S.getStanding(req.user, t) };
};
const minsToStart = (t, b) => (U.slotStart(t, b.date, b.slot) - Date.now()) / 6e4;

router.post('/bookings/:id/cancel', async (req, res) => {
  const m = await mine(req, res); if (!m) return;
  const { b, t, st } = m, late = minsToStart(t, b) < 120;
  b.status = 'cancelled'; await b.save();
  if (late) st.lc++;
  S.addLog(st, late ? 'Late cancel (−4)' : 'Cancelled early (no penalty)');
  await st.save();
  res.json({ ok: true, late });
});

router.post('/bookings/:id/reschedule', async (req, res) => {
  const m = await mine(req, res); if (!m) return;
  const { b, t, st } = m;
  if (minsToStart(t, b) < 120) return res.status(400).json({ error: 'Rescheduling closes 2 hours before the slot.' });
  b.status = 'cancelled'; await b.save();
  S.addLog(st, 'Rescheduled (no penalty)');
  await st.save();
  res.json({ ok: true, temple: t.id, day: Math.max(0, Math.min(2, Math.round((new Date(b.date) - new Date(U.todayISO())) / 864e5))) });
});

router.post('/bookings/:id/checkin', async (req, res) => {
  const m = await mine(req, res); if (!m) return;
  const { b, t, st } = m, mins = minsToStart(t, b);
  if (mins > 30 || mins < -60) {
    const demo = process.env.DEMO_MODE !== 'false';
    if (!(demo && req.body && req.body.simulate === true)) {
      const msg = mins > 30 ? `Check-in opens 30 minutes before your slot (in about ${U.hm(Math.round(mins - 30))}).` : 'Your check-in window has closed.';
      return res.status(400).json({ error: msg, code: demo ? 'OUTSIDE_WINDOW' : 'CLOSED' });
    }
  }
  b.status = 'done'; await b.save();
  st.done++; st.streak++;
  S.addLog(st, 'Check-in verified (+5)');
  await st.save();
  res.json({ ok: true, temple: t.id });
});

router.post('/reports', temple, async (req, res) => {
  const minutes = Number((req.body || {}).minutes);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) return res.status(400).json({ error: 'Enter a wait between 5 and 240 minutes.' });
  await Report.create({ user: req.user._id, temple: req.temple.id, minutes });
  const st = await S.getStanding(req.user, req.temple);
  S.addLog(st, 'Wait time reported');
  await st.save();
  res.status(201).json({ ok: true });
});

module.exports = router;
