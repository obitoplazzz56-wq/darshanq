const crypto = require('crypto');
const { Booking, Config } = require('./models');
const U = require('./utils');

const getConfig = () => Config.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true });

// total places used per slot (all devotees) for a date
async function usedByDate(date) {
  const rows = await Booking.aggregate([
    { $match: { date, status: { $in: ['booked', 'done'] } } },
    { $group: { _id: '$slot', n: { $sum: '$party' } } },
  ]);
  const m = {};
  rows.forEach(r => { m[r._id] = r.n; });
  return m;
}
const placesLeft = (cap, date, i, used) => cap - U.seededTaken(date, i) - (used[i] || 0);

const newCode = () => 'dq' + crypto.randomBytes(3).toString('hex');

const addLog = (u, t) => { u.log.unshift({ t, at: new Date() }); if (u.log.length > 50) u.log.length = 50; };

const userView = u => {
  const s = U.score(u);
  return {
    id: u._id, name: u.name, phone: u.phone, pincode: u.pincode, local: u.local, role: u.role,
    done: u.done, streak: u.streak, ns: u.ns, lc: u.lc, score: s, tier: U.tier(s), eligible: U.eligible(u),
    prefs: u.prefs, log: u.log.slice(0, 30),
  };
};

const bookingView = b => ({
  id: b.code, date: b.date, slot: b.slot, party: b.party, assist: b.assist, status: b.status,
  when: U.dayLabel(b.date), time: U.tm(U.SL[b.slot]), checkinOpens: U.tm(U.SL[b.slot] - .5),
  waitMin: U.localWait(U.SL[b.slot]), startsAt: U.slotStart(b.date, b.slot).toISOString(),
});

module.exports = { getConfig, usedByDate, placesLeft, newCode, addLog, userView, bookingView };
