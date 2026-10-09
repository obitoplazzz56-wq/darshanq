// ---------------------------------------------------------------------------
// Temple catalogue. To add or edit a temple, change this file only.
//  - pins:     pincodes treated as "local" for that temple (ranges or single codes)
//  - slots:    slot start times in hours (IST), .5 = half past
//  - peaks:    [hour, strength] pairs that shape the hourly crowd forecast
//  - aarti:    SAMPLE timings shown to devotees. Verify with each temple before real use.
// Pincodes are a best-effort starting point: please verify them with India Post.
// ---------------------------------------------------------------------------
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

const TEMPLES = [
  {
    id: 'mahakaleshwar', name: 'Mahakaleshwar', city: 'Ujjain', state: 'Madhya Pradesh',
    pins: range(456001, 456010), demoPin: '456001', baseQueue: 1284,
    slots: [5.5, 6.5, 7.5, 8.5, 9.5, 11, 14, 16.5, 18, 19.5],
    demand: { 5: .35, 6: .3, 7: .4, 8: .55, 9: .85, 10: 1, 11: .95, 12: .8, 13: .6, 14: .5, 15: .55, 16: .65, 17: .8, 18: .9, 19: .7, 20: .45 },
    aarti: [['Bhasma Aarti', 'about 4:00 AM'], ['Morning pooja', 'about 7:00 AM'], ['Bhog Aarti', 'about 10:00 AM'], ['Sandhya Aarti', 'about 6:45 PM'], ['Shayan Aarti', 'about 10:30 PM']],
  },
  {
    id: 'jagannath-puri', name: 'Jagannath Puri', city: 'Puri', state: 'Odisha',
    pins: range(752001, 752005), demoPin: '752001', baseQueue: 1650,
    slots: [5.5, 7, 8.5, 10, 12, 14.5, 16.5, 18, 19.5],
    peaks: [[10, .7], [17.5, .6]],
    aarti: [['Mangala Alati', 'about 5:00 AM'], ['Sakala Dhupa', 'about 10:00 AM'], ['Madhyahna Dhupa', 'about 1:00 PM'], ['Sandhya Alati', 'about 7:00 PM'], ['Badasingara Besha', 'about 11:00 PM']],
  },
  {
    id: 'khatu-shyam', name: 'Khatu Shyam', city: 'Khatu, Sikar', state: 'Rajasthan',
    pins: ['332602', '332001', '332002'], demoPin: '332602', baseQueue: 2100,
    slots: [5.5, 7, 8.5, 10, 12, 14.5, 16.5, 18, 19.5],
    peaks: [[9, .6], [12.5, .5], [18.5, .7]],
    aarti: [['Mangla Aarti', 'about 5:30 AM'], ['Shringar Aarti', 'about 8:00 AM'], ['Bhog Aarti', 'about 12:30 PM'], ['Sandhya Aarti', 'about 6:30 PM'], ['Shayan Aarti', 'about 9:00 PM']],
  },
  {
    id: 'sawariya-seth', name: 'Sawariya Seth Ji', city: 'Mandphiya, Chittorgarh', state: 'Rajasthan',
    pins: ['312901', '312001', '312002'], demoPin: '312901', baseQueue: 900,
    slots: [5.5, 7, 8.5, 10, 12, 14.5, 16.5, 18, 19.5],
    peaks: [[9.5, .55], [17.5, .6]],
    aarti: [['Mangla Aarti', 'about 5:00 AM'], ['Rajbhog Aarti', 'about 11:30 AM'], ['Sandhya Aarti', 'about 6:30 PM'], ['Shayan Aarti', 'about 9:00 PM']],
  },
  {
    id: 'vaishno-devi', name: 'Vaishno Devi', city: 'Katra, Reasi', state: 'Jammu & Kashmir',
    pins: ['182301', '182311', '182320'], demoPin: '182301', baseQueue: 3200,
    slots: [5, 6.5, 8, 9.5, 11, 14, 16.5, 18, 19.5],
    peaks: [[8, .5], [11, .6], [17, .5]],
    aarti: [['Morning Aarti', 'around sunrise'], ['Evening Aarti', 'around sunset']],
  },
];

// Build the hourly demand table (5am-8pm) for temples that give "peaks" instead of an explicit table
const makeDemand = peaks => {
  const d = {};
  for (let h = 5; h <= 20; h++) {
    let v = .3;
    peaks.forEach(([ph, w]) => { v += w * Math.exp(-((h - ph) ** 2) / (2 * 1.8 ** 2)); });
    d[h] = Math.round(Math.min(1, v) * 100) / 100;
  }
  return d;
};
TEMPLES.forEach(t => { t.demand = t.demand || makeDemand(t.peaks); });

const BY_ID = Object.fromEntries(TEMPLES.map(t => [t.id, t]));
const publicView = t => ({ id: t.id, name: t.name, city: t.city, state: t.state, demoPin: t.demoPin, aarti: t.aarti });

module.exports = { TEMPLES, BY_ID, DEFAULT_ID: TEMPLES[0].id, publicView };
