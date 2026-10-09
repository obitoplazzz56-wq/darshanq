const router = require('express').Router();
const { Booking, Config, Standing } = require('../models');
const { auth, admin, temple } = require('../middleware');
const { BY_ID } = require('../temples');
const U = require('../utils');
const S = require('../services');

router.use(auth, admin);

// All admin routes work on one temple at a time: ?temple=<id> (or body.temple)
router.get('/dashboard', temple, async (req, res) => {
  const t = req.temple, date = U.todayISO(), cfg = await S.getConfig(t);
  const list = await Booking.find({ temple: t.id, date }).populate('user', 'name').sort({ slot: 1 });
  const active = list.filter(b => b.status !== 'cancelled'), tot = active.length;
  const pct = n => (tot ? Math.round((n / tot) * 1000) / 10 : 0);
  const used = await S.usedByDate(t, date);
  res.json({
    temple: t.name,
    queue: U.liveQueue(t),
    config: { paused: cfg.paused, cap: cfg.cap, announcement: cfg.announcement },
    stats: {
      bookingsToday: tot,
      checkedInPct: pct(active.filter(b => b.status === 'done').length),
      noShowPct: pct(active.filter(b => b.status === 'noshow').length),
    },
    utilisation: t.slots.map((h, i) => ({ time: U.tm(h), pct: Math.round(Math.min(100, ((cfg.cap - S.placesLeft(t, cfg.cap, date, i, used)) / cfg.cap) * 100)) })),
    bookings: list.map(b => ({ id: b.code, name: b.user ? b.user.name : 'Deleted user', time: U.tm(t.slots[b.slot]), party: b.party, status: b.status })),
  });
});

router.put('/config', temple, async (req, res) => {
  const { paused, cap, announcement } = req.body || {};
  const set = {};
  if (typeof paused === 'boolean') set.paused = paused;
  if (cap !== undefined) {
    const c = Number(cap);
    if (!Number.isInteger(c) || c < 1 || c > 100) return res.status(400).json({ error: 'Places per slot must be between 1 and 100.' });
    set.cap = c;
  }
  if (typeof announcement === 'string') set.announcement = announcement.trim().slice(0, 120);
  const c = await Config.findOneAndUpdate({ key: req.temple.id }, { $set: set, $setOnInsert: { key: req.temple.id } }, { upsert: true, new: true });
  res.json({ paused: c.paused, cap: c.cap, announcement: c.announcement });
});

router.post('/bookings/:id/noshow', async (req, res) => {
  const b = await Booking.findOne({ code: req.params.id });
  if (!b || !BY_ID[b.temple]) return res.status(404).json({ error: 'Booking not found.' });
  if (b.status !== 'booked') return res.status(400).json({ error: 'Only active bookings can be marked as no-show.' });
  b.status = 'noshow'; await b.save();
  const st = await Standing.findOne({ user: b.user, temple: b.temple });
  if (st) { st.ns++; S.addLog(st, 'Marked as no-show (−10)'); await st.save(); }
  res.json({ ok: true });
});

router.get('/export', temple, async (req, res) => {
  const t = req.temple;
  const list = await Booking.find({ temple: t.id }).populate('user', 'name phone').sort({ date: -1, slot: 1 }).limit(5000);
  const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const rows = [['pass', 'temple', 'date', 'slot', 'devotee', 'party', 'assistance', 'status'],
    ...list.map(b => [b.code, t.name, b.date, U.tm(t.slots[b.slot]), b.user ? b.user.name : '', b.party, b.assist ? 'yes' : 'no', b.status])];
  res.type('text/csv').attachment(`darshanq-${t.id}-bookings.csv`).send(rows.map(r => r.map(cell).join(',')).join('\n'));
});

module.exports = router;
