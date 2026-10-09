const router = require('express').Router();
const { User, Booking, Report } = require('../models');
const { auth } = require('../middleware');
const U = require('../utils');
const S = require('../services');

/* ---------- public ---------- */
router.get('/config', async (req, res) => {
  const c = await S.getConfig();
  res.json({ paused: c.paused, cap: c.cap, announcement: c.announcement });
});

router.get('/crowd', async (req, res) => {
  const f = req.query.festival === '1' ? 1.5 : 1;
  const queue = U.liveQueue();
  let wait = Math.round(queue * .173);
  const since = new Date(Date.now() - 24 * 3600e3);
  const reps = await Report.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(50).select('minutes');
  const avg = reps.length ? Math.round(reps.reduce((a, r) => a + r.minutes, 0) / reps.length) : null;
  if (avg !== null) wait = Math.round(wait * .6 + avg * .4);
  const forecast = Object.keys(U.D).map(Number).map(h => ({ hour: h, label: U.tm(h), wait: U.generalWait(h, f) }));
  res.json({ queue, generalWait: wait, localWait: Math.round(15 + wait * .08), avgReported: avg, reports: reps.length, forecast });
});

/* ---------- authenticated ---------- */
router.use(auth);

router.get('/me', (req, res) => res.json(S.userView(req.user)));

router.put('/me/prefs', async (req, res) => {
  const { sms, wa } = req.body || {};
  if (typeof sms === 'boolean') req.user.prefs.sms = sms;
  if (typeof wa === 'boolean') req.user.prefs.wa = wa;
  await req.user.save();
  res.json(S.userView(req.user));
});

// Reset demo data: removes this account and its bookings
router.delete('/me', async (req, res) => {
  await Booking.deleteMany({ user: req.user._id });
  await User.deleteOne({ _id: req.user._id });
  res.json({ ok: true });
});

router.get('/slots', async (req, res) => {
  const day = Math.min(2, Math.max(0, parseInt(req.query.day, 10) || 0));
  const f = req.query.festival === '1' ? 1.5 : 1;
  const t = U.todayISO(), date = U.addDays(t, day);
  const cfg = await S.getConfig(), used = await S.usedByDate(date), nowMin = U.nowMinutes();
  res.json({
    date,
    days: [0, 1, 2].map(n => ({ day: n, label: U.dayLabel(U.addDays(t, n)) })),
    slots: U.SL.map((h, i) => {
      const w = U.generalWait(h, f);
      return {
        slot: i, time: U.tm(h), crowd: U.level(w), generalWait: w, localWait: U.localWait(h),
        left: Math.max(0, S.placesLeft(cfg.cap, date, i, used)),
        passed: day === 0 && h * 60 < nowMin + 30,
      };
    }),
  });
});

router.get('/bookings', async (req, res) => {
  const list = await Booking.find({ user: req.user._id }).sort({ date: -1, slot: -1 }).limit(100);
  res.json(list.map(S.bookingView));
});

router.post('/bookings', async (req, res) => {
  const u = req.user, cfg = await S.getConfig();
  if (cfg.paused) return res.status(403).json({ error: 'The free lane is paused by the temple.' });
  if (!U.eligible(u)) return res.status(403).json({ error: 'The free lane is locked. You need to be a verified Ujjain local with a trust score of 60 or more.' });

  const { date, slot, party = 1, assist = false } = req.body || {};
  const i = Number(slot), g = Number(party);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !Number.isInteger(i) || i < 0 || i >= U.SL.length || !Number.isInteger(g) || g < 1 || g > 4)
    return res.status(400).json({ error: 'Invalid booking details.' });
  const t = U.todayISO();
  if (date < t || date > U.addDays(t, 2)) return res.status(400).json({ error: 'You can book from today up to 2 days ahead.' });
  if (date === t && U.SL[i] * 60 < U.nowMinutes() + 30) return res.status(400).json({ error: 'That slot has already passed.' });
  if (await Booking.exists({ user: u._id, date, status: 'booked' }))
    return res.status(409).json({ error: 'You already have a booking that day. Cancel it first to change slots.' });

  const left = S.placesLeft(cfg.cap, date, i, await S.usedByDate(date));
  if (left < g) return res.status(409).json({ error: `Only ${Math.max(0, left)} places left in this slot. Reduce the party size or pick another slot.` });

  const b = await Booking.create({ code: S.newCode(), user: u._id, date, slot: i, party: g, assist: !!assist });
  S.addLog(u, `Reserved ${U.tm(U.SL[i])} for ${g}`);
  await u.save();
  res.status(201).json(S.bookingView(b));
});

const mine = async (req, res) => {
  const b = await Booking.findOne({ code: req.params.id, user: req.user._id });
  if (!b) { res.status(404).json({ error: 'Booking not found.' }); return null; }
  if (b.status !== 'booked') { res.status(400).json({ error: 'This booking is no longer active.' }); return null; }
  return b;
};
const minsToStart = b => (U.slotStart(b.date, b.slot) - Date.now()) / 6e4;

router.post('/bookings/:id/cancel', async (req, res) => {
  const b = await mine(req, res); if (!b) return;
  const late = minsToStart(b) < 120;
  b.status = 'cancelled'; await b.save();
  if (late) req.user.lc++;
  S.addLog(req.user, late ? 'Late cancel (−4)' : 'Cancelled early (no penalty)');
  await req.user.save();
  res.json({ ok: true, late });
});

router.post('/bookings/:id/reschedule', async (req, res) => {
  const b = await mine(req, res); if (!b) return;
  if (minsToStart(b) < 120) return res.status(400).json({ error: 'Rescheduling closes 2 hours before the slot.' });
  b.status = 'cancelled'; await b.save();
  S.addLog(req.user, 'Rescheduled (no penalty)');
  await req.user.save();
  res.json({ ok: true, day: Math.max(0, Math.min(2, Math.round((new Date(b.date) - new Date(U.todayISO())) / 864e5))) });
});

router.post('/bookings/:id/checkin', async (req, res) => {
  const b = await mine(req, res); if (!b) return;
  const m = minsToStart(b);
  if (m > 30 || m < -60) {
    const demo = process.env.DEMO_MODE !== 'false';
    if (!(demo && req.body && req.body.simulate === true)) {
      const msg = m > 30 ? `Check-in opens 30 minutes before your slot (in about ${U.hm(Math.round(m - 30))}).` : 'Your check-in window has closed.';
      return res.status(400).json({ error: msg, code: demo ? 'OUTSIDE_WINDOW' : 'CLOSED' });
    }
  }
  b.status = 'done'; await b.save();
  req.user.done++; req.user.streak++;
  S.addLog(req.user, 'Check-in verified (+5)');
  await req.user.save();
  res.json({ ok: true });
});

router.post('/reports', async (req, res) => {
  const minutes = Number((req.body || {}).minutes);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) return res.status(400).json({ error: 'Enter a wait between 5 and 240 minutes.' });
  await Report.create({ user: req.user._id, minutes });
  S.addLog(req.user, 'Wait time reported');
  await req.user.save();
  res.status(201).json({ ok: true });
});

module.exports = router;
