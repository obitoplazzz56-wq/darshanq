const router = require('express').Router();
const { Booking, Config } = require('../models');
const { auth, admin } = require('../middleware');
const U = require('../utils');
const S = require('../services');

router.use(auth, admin);

router.get('/dashboard', async (req, res) => {
  const date = U.todayISO(), cfg = await S.getConfig();
  const list = await Booking.find({ date }).populate('user', 'name').sort({ slot: 1 });
  const active = list.filter(b => b.status !== 'cancelled'), tot = active.length;
  const pct = n => (tot ? Math.round((n / tot) * 1000) / 10 : 0);
  const used = await S.usedByDate(date);
  res.json({
    queue: U.liveQueue(),
    config: { paused: cfg.paused, cap: cfg.cap, announcement: cfg.announcement },
    stats: {
      bookingsToday: tot,
      checkedInPct: pct(active.filter(b => b.status === 'done').length),
      noShowPct: pct(active.filter(b => b.status === 'noshow').length),
    },
    utilisation: U.SL.map((h, i) => ({ time: U.tm(h), pct: Math.round(Math.min(100, ((cfg.cap - S.placesLeft(cfg.cap, date, i, used)) / cfg.cap) * 100)) })),
    bookings: list.map(b => ({ id: b.code, name: b.user ? b.user.name : 'Deleted user', time: U.tm(U.SL[b.slot]), party: b.party, status: b.status })),
  });
});

router.put('/config', async (req, res) => {
  const { paused, cap, announcement } = req.body || {};
  const set = {};
  if (typeof paused === 'boolean') set.paused = paused;
  if (cap !== undefined) {
    const c = Number(cap);
    if (!Number.isInteger(c) || c < 1 || c > 100) return res.status(400).json({ error: 'Places per slot must be between 1 and 100.' });
    set.cap = c;
  }
  if (typeof announcement === 'string') set.announcement = announcement.trim().slice(0, 120);
  const c = await Config.findOneAndUpdate({ key: 'main' }, { $set: set, $setOnInsert: { key: 'main' } }, { upsert: true, new: true });
  res.json({ paused: c.paused, cap: c.cap, announcement: c.announcement });
});

router.post('/bookings/:id/noshow', async (req, res) => {
  const b = await Booking.findOne({ code: req.params.id }).populate('user');
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  if (b.status !== 'booked') return res.status(400).json({ error: 'Only active bookings can be marked as no-show.' });
  b.status = 'noshow'; await b.save();
  if (b.user) { b.user.ns++; S.addLog(b.user, 'Marked as no-show (−10)'); await b.user.save(); }
  res.json({ ok: true });
});

router.get('/export', async (req, res) => {
  const list = await Booking.find().populate('user', 'name phone').sort({ date: -1, slot: 1 }).limit(5000);
  const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const rows = [['pass', 'date', 'slot', 'devotee', 'party', 'assistance', 'status'],
    ...list.map(b => [b.code, b.date, U.tm(U.SL[b.slot]), b.user ? b.user.name : '', b.party, b.assist ? 'yes' : 'no', b.status])];
  res.type('text/csv').attachment('darshanq-bookings.csv').send(rows.map(r => r.map(cell).join(',')).join('\n'));
});

module.exports = router;
