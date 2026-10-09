const crypto = require('crypto');
const { Booking, Config, Standing } = require('./models');
const { BY_ID } = require('./temples');
const U = require('./utils');

const getConfig = t => Config.findOneAndUpdate({ key: t.id }, { $setOnInsert: { key: t.id } }, { upsert: true, new: true });

// total places used per slot (all devotees) for a temple + date
async function usedByDate(t, date) {
  const rows = await Booking.aggregate([
    { $match: { temple: t.id, date, status: { $in: ['booked', 'done'] } } },
    { $group: { _id: '$slot', n: { $sum: '$party' } } },
  ]);
  const m = {};
  rows.forEach(r => { m[r._id] = r.n; });
  return m;
}
const placesLeft = (t, cap, date, i, used) => cap - U.seededTaken(t, date, i) - (used[i] || 0);

const newCode = () => 'dq' + crypto.randomBytes(3).toString('hex');
const addLog = (s, text) => { s.log.unshift({ t: text, at: new Date() }); if (s.log.length > 50) s.log.length = 50; };

// Find (or create) this devotee's record at this temple. Local devotees start with demo history unless DEMO_MODE=false.
async function getStanding(user, t) {
  let s = await Standing.findOne({ user: user._id, temple: t.id });
  if (s) return s;
  const local = U.isLocal(user.pincode, t);
  const seed = local && process.env.DEMO_MODE !== 'false';
  s = new Standing({ user: user._id, temple: t.id, done: seed ? 9 : 0, streak: seed ? 4 : 0 });
  addLog(s, local ? `Verified as ${t.city} local` : 'Verified as visitor');
  if (seed) addLog(s, '9 earlier check-ins imported (demo history)');
  try { await s.save(); } catch (e) { s = await Standing.findOne({ user: user._id, temple: t.id }); } // parallel first requests
  return s;
}

const userView = (u, s, t) => {
  const local = U.isLocal(u.pincode, t), sc = U.score(s, local);
  return {
    id: u._id, name: u.name, phone: u.phone, pincode: u.pincode, role: u.role, temple: t.id,
    local, done: s.done, streak: s.streak, ns: s.ns, lc: s.lc, score: sc, tier: U.tier(sc), eligible: local && sc >= 60,
    prefs: u.prefs, log: s.log.slice(0, 30),
  };
};

const bookingView = b => {
  const t = BY_ID[b.temple], h = t.slots[b.slot];
  return {
    id: b.code, temple: t.id, templeName: t.name, date: b.date, slot: b.slot, party: b.party, assist: b.assist, status: b.status,
    when: U.dayLabel(b.date), time: U.tm(h), checkinOpens: U.tm(h - .5),
    waitMin: U.localWait(t, h), startsAt: U.slotStart(t, b.date, b.slot).toISOString(),
  };
};

module.exports = { getConfig, usedByDate, placesLeft, newCode, addLog, getStanding, userView, bookingView };
