import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../App.jsx';
import { Banner, Forecast, Modal, Ring, useCrowd } from '../components/ui.jsx';
import { hm, pc, stamp } from '../util';
import Admin from './Admin.jsx';

const PortalCtx = createContext(null);
const usePortal = () => useContext(PortalCtx);

function useBookings() {
  const [list, setList] = useState(null);
  const { toast } = useApp();
  const reload = useCallback(() => api.bookings().then(setList).catch(e => toast(e.message)), [toast]);
  useEffect(() => { reload(); }, [reload]);
  return [list, reload];
}
const nextBooking = list => (list || []).filter(b => b.status === 'booked').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];

/* ---------- decorative pass QR (demo only, not a scannable code) ---------- */
function QR({ id }) {
  let h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const out = [];
  const finder = (x, y) => out.push(
    <g key={'f' + x + y}>
      <rect x={x} y={y} width="7" height="7" fill="#1d1512" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#1d1512" />
    </g>);
  finder(0, 0); finder(18, 0); finder(0, 18);
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) continue;
    h = (h * 1103515245 + 12345) >>> 0;
    if ((h >>> 16) & 1) out.push(<rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill="#1d1512" />);
  }
  return <svg className="qr" viewBox="0 0 25 25" shapeRendering="crispEdges" aria-label="Pass code">{out}</svg>;
}

const STATUS = { booked: 'Reserved', done: 'Visit completed', noshow: 'No-show', cancelled: 'Cancelled' };

function Pass({ b, live, after }) {
  const { toast, refresh } = useApp();
  const P = usePortal();

  const checkin = async simulate => {
    try {
      await api.checkin(b.id, simulate);
      toast('Check-in recorded.');
      await refresh(); after(); P.askReport();
    } catch (e) {
      if (e.code === 'OUTSIDE_WINDOW' && !simulate) { if (window.confirm(e.message + '\n\nSimulate being at the temple for the demo?')) checkin(true); }
      else toast(e.message);
    }
  };
  const resched = async () => {
    try { const r = await api.reschedule(b.id); await refresh(); P.setDay(r.day); P.go('book'); }
    catch (e) { toast(e.message); }
  };
  const cancel = async () => {
    const late = new Date(b.startsAt) - Date.now() < 72e5;
    if (late && !window.confirm('Cancelling within 2 hours costs 4 trust points. Continue?')) return;
    try { const r = await api.cancel(b.id); toast(r.late ? 'Cancelled. Trust score −4.' : 'Cancelled with no penalty.'); await refresh(); after(); }
    catch (e) { toast(e.message); }
  };

  return (
    <div className="pass">
      <QR id={b.id} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <span className={`pill ${b.status === 'noshow' || b.status === 'cancelled' ? 'b' : ''}`}>{STATUS[b.status]}</span>
        <h3 style={{ marginTop: 6 }}>{b.when}, {b.time}</h3>
        <p className="sm mut" style={{ margin: 0 }}>Pass {b.id.toUpperCase()} · Free local lane · ~{b.waitMin} min wait</p>
        {(b.party > 1 || b.assist) && <p className="sm" style={{ margin: '4px 0 0' }}>Party of {b.party}{b.assist ? ', assistance requested' : ''}</p>}
        {live && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn pri sm" onClick={() => checkin(false)}>Check in at temple</button>
            <button className="btn sm" onClick={resched}>Reschedule</button>
            <button className="btn sm" onClick={cancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

const LogList = ({ items }) => items.map((l, i) => (
  <div key={i} className="row sp sm" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><span>{l.t}</span><span className="mut">{stamp(l.at)}</span></div>
));

/* ---------- views ---------- */
function Overview({ fs, cfg }) {
  const { user } = useApp();
  const P = usePortal();
  const crowd = useCrowd(fs);
  const [list, reload] = useBookings();
  const a = nextBooking(list), h = new Date().getHours();
  return (
    <>
      <div className="row sp">
        <div>
          <h2>Good {h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h2>
          <p className="mut">{user.eligible ? 'You can book the free priority lane.' : user.local ? 'Your score is below 60. Complete visits to unlock the free lane.' : 'The free lane is for Ujjain locals. Use the general queue and the forecast below.'}</p>
        </div>
        <span className={`pill ${user.eligible ? '' : 'w'}`}>{user.eligible ? 'Eligible' : 'Not yet eligible'}</span>
      </div>
      <Banner cfg={cfg} />
      <div className="g2" style={{ marginTop: 12 }}>
        <div className="card"><div className="sm mut">Trust score</div><Ring v={user.score} /><p className="sm mut" style={{ textAlign: 'center', margin: 0 }}>{user.tier}</p></div>
        <div className="card">
          <div className="row sp"><h3>Crowd right now</h3><span className="pill w">High</span></div>
          <div className="row" style={{ gap: 24, margin: '14px 0' }}>
            <div><div className="sm mut">Queue</div><b className="big">{crowd ? crowd.queue.toLocaleString('en-IN') : '…'}</b></div>
            <div><div className="sm mut">Wait</div><b className="big">{crowd ? hm(crowd.generalWait) : '…'}</b></div>
            <div><div className="sm mut">Your lane</div><b className="big">{crowd ? hm(crowd.localWait) : '…'}</b></div>
          </div>
          {crowd && crowd.reports > 0 && <p className="sm">Devotees report an average wait of <b>{hm(crowd.avgReported)}</b> ({crowd.reports} reports).</p>}
          <Forecast data={crowd} festival={fs} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        {a ? <Pass b={a} live after={reload} /> : (
          <div className="row sp">
            <div><h3>No slot reserved</h3><p className="mut" style={{ margin: 0 }}>{user.eligible ? 'Reserve before the 9 AM peak. It is free.' : 'Reserve is available once you are eligible.'}</p></div>
            <button className="btn pri" disabled={!user.eligible} onClick={() => P.go('book')}>Choose a slot</button>
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 20 }}><h3>Recent activity</h3><LogList items={user.log.slice(0, 4)} /></div>
    </>
  );
}

function Book({ fs, setFs, cfg }) {
  const { user, toast, refresh } = useApp();
  const P = usePortal();
  const [data, setData] = useState(null), [sel, setSel] = useState(null);
  const [g, setG] = useState(1), [as, setAs] = useState(false), [err, setErr] = useState('');
  const day = P.day;

  useEffect(() => { api.slots(day, fs).then(setData).catch(e => toast(e.message)); }, [day, fs, toast]);

  if (!user.eligible) return (
    <>
      <h2>Reserve a slot</h2>
      <div className="card" style={{ marginTop: 16 }}><h3>Free lane locked</h3>
        <p className="mut">{user.local ? `Your score is ${user.score}. You need 60. Each completed check-in adds 5.` : 'Priority slots are for verified Ujjain residents (pincode 456001–456010).'}</p></div>
    </>
  );

  const open = s => { setSel(s); setG(1); setAs(false); setErr(''); };
  const confirm = async () => {
    try {
      await api.book({ date: data.date, slot: sel.slot, party: g, assist: as });
      setSel(null); toast('Booked. Your pass is ready.'); await refresh(); P.go('passes');
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <h2>Reserve free priority darshan</h2>
      <Banner cfg={cfg} />
      <p className="mut">One booking per day. Check-in opens 30 minutes before your slot.</p>
      <div className="chips">
        {(data ? data.days : [0, 1, 2].map(n => ({ day: n, label: '…' }))).map(d => (
          <button key={d.day} className={`chip ${d.day === day ? 'on' : ''}`} onClick={() => P.setDay(d.day)}>{d.label}</button>
        ))}
        <label className="sm row" style={{ margin: '0 0 0 auto', gap: 6, fontWeight: 500 }}>
          <input type="checkbox" checked={fs} onChange={e => setFs(e.target.checked)} /> Festival day
        </label>
      </div>
      <div className="g2">
        {data && data.slots.map(s => {
          const off = s.passed || s.left <= 0 || (cfg && cfg.paused);
          return (
            <button key={s.slot} className="slot" disabled={off} onClick={() => open(s)}>
              <div className="row sp"><b style={{ fontSize: 18 }}>{s.time}</b><span className={`pill ${pc(s.crowd)}`}>{s.crowd} crowd</span></div>
              <div className="sm mut" style={{ marginTop: 6 }}>General wait {hm(s.generalWait)}, your lane {s.localWait} min</div>
              <div className="row sp sm" style={{ marginTop: 10 }}>
                <span>{s.passed ? 'Slot passed' : s.left <= 0 ? 'Full' : s.left + ' places left'}</span>
                <b style={{ color: 'var(--saf)' }}>{off ? '' : 'Reserve'}</b>
              </div>
            </button>
          );
        })}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)}>
        <h3>Confirm booking</h3>
        <p className="sm mut">{sel && `${sel.time}, ${data.days[day].label}`}</p>
        <label htmlFor="bg">Party size, including you</label>
        <select id="bg" value={g} onChange={e => setG(+e.target.value)}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select>
        <label className="row" style={{ fontWeight: 500 }}><input type="checkbox" checked={as} onChange={e => setAs(e.target.checked)} /> Senior citizen or wheelchair assistance</label>
        <div className="err">{err}</div>
        <div className="row"><button className="btn pri" onClick={confirm}>Confirm booking</button><button className="btn sm" onClick={() => setSel(null)}>Back</button></div>
      </Modal>
    </>
  );
}

function Passes() {
  const P = usePortal();
  const [list, reload] = useBookings();
  return (
    <>
      <h2>My passes</h2>
      {list && list.length === 0 && (
        <div className="card" style={{ marginTop: 14 }}><p className="mut">No passes yet. Reserve a slot to get your first one.</p><button className="btn pri" onClick={() => P.go('book')}>Reserve a slot</button></div>
      )}
      {(list || []).map(b => <div key={b.id} className="card" style={{ marginTop: 14 }}><Pass b={b} live={b.status === 'booked'} after={reload} /></div>)}
    </>
  );
}

function Trust() {
  const { user } = useApp();
  const s = user.score;
  const rows = [
    ['Verified local base', user.local ? 30 : 0],
    [`Completed check-ins (${user.done}, max 10)`, Math.min(user.done, 10) * 5],
    [`Weekly streak (${user.streak}, max 6)`, Math.min(user.streak, 6) * 2],
    [`No-shows (${user.ns})`, -user.ns * 10],
    [`Late cancels (${user.lc})`, -user.lc * 4],
  ];
  const badges = [['First visit', user.done >= 1], ['5 visits', user.done >= 5], ['10 visits', user.done >= 10], ['4-week streak', user.streak >= 4], ['Clean record', !user.ns && !user.lc]];
  return (
    <>
      <h2>Trust score</h2>
      <div className="g2" style={{ marginTop: 12 }}>
        <div className="card"><Ring v={s} /><p style={{ textAlign: 'center' }}><b>{user.tier}</b><br /><span className="sm mut">{s >= 60 ? 'Free lane unlocked.' : `${60 - s} points to unlock.`}</span></p></div>
        <div className="card"><h3>Breakdown</h3><table><tbody>
          {rows.map(r => <tr key={r[0]}><td>{r[0]}</td><td style={{ textAlign: 'right', fontWeight: 700, color: r[1] < 0 ? 'var(--bad)' : 'inherit' }}>{r[1] > 0 ? '+' : ''}{r[1]}</td></tr>)}
        </tbody></table></div>
      </div>
      <div className="card" style={{ marginTop: 20 }}><h3>Badges</h3><div className="chips">
        {badges.map(b => <span key={b[0]} className={`chip ${b[1] ? 'on' : ''}`} style={b[1] ? {} : { opacity: .5 }}>{b[0]}</span>)}
      </div></div>
      <div className="card" style={{ marginTop: 20 }}><h3>History</h3><LogList items={user.log} /></div>
    </>
  );
}

const AARTI = [['Bhasma Aarti', 'about 4:00 AM'], ['Morning pooja', 'about 7:00 AM'], ['Bhog Aarti', 'about 10:00 AM'], ['Sandhya Aarti', 'about 6:45 PM'], ['Shayan Aarti', 'about 10:30 PM']];
function Aarti({ cfg }) {
  const { user, setUser, toast } = useApp();
  const [list] = useBookings();
  const a = nextBooking(list);
  const rem = a ? [`Check-in opens at ${a.checkinOpens}, ${a.when.toLowerCase()}.`, 'Carry the photo ID used at sign-up.', a.party > 1 ? `Your party of ${a.party} must arrive together.` : 'Arrive 15 minutes before your slot.'] : [];
  const pref = async (k, v) => { try { setUser(await api.setPrefs({ [k]: v })); toast('Preference saved.'); } catch (e) { toast(e.message); } };
  return (
    <>
      <h2>Aarti and reminders</h2><Banner cfg={cfg} />
      <div className="g2" style={{ marginTop: 12 }}>
        <div className="card"><h3>Typical aarti timings</h3><table><tbody>{AARTI.map(x => <tr key={x[0]}><td>{x[0]}</td><td style={{ textAlign: 'right' }}>{x[1]}</td></tr>)}</tbody></table>
          <p className="sm mut">Timings change with season and festivals. Aarti entry follows the temple's own rules. DarshanQ covers darshan slots only.</p></div>
        <div className="card"><h3>Your reminders</h3>
          {rem.length ? rem.map(r => <div key={r} className="lane on sm">{r}</div>) : <p className="mut">Reserve a slot to see reminders here.</p>}
          <label className="row" style={{ fontWeight: 500 }}><input type="checkbox" checked={user.prefs.sms} onChange={e => pref('sms', e.target.checked)} /> Text me 1 hour before</label>
          <label className="row" style={{ fontWeight: 500 }}><input type="checkbox" checked={user.prefs.wa} onChange={e => pref('wa', e.target.checked)} /> Send my pass on WhatsApp</label>
          <p className="sm mut">Preferences are saved. Actual SMS/WhatsApp delivery needs a messaging provider, which this prototype does not include.</p>
        </div>
      </div>
    </>
  );
}

/* ---------- shell ---------- */
export default function Portal() {
  const { user, logout, toast } = useApp();
  const [view, setView] = useState('overview'), [day, setDay] = useState(0), [fs, setFs] = useState(false);
  const [cfg, setCfg] = useState(null), [rep, setRep] = useState(false), [mins, setMins] = useState(20);
  const loadCfg = useCallback(() => api.config().then(setCfg).catch(() => {}), []);
  useEffect(() => { loadCfg(); }, [view, loadCfg]);

  const go = v => { setView(v); window.scrollTo({ top: 0 }); };
  const menu = [['overview', 'Overview'], ['book', 'Reserve a slot'], ['passes', 'My passes'], ['trust', 'Trust score'], ['aarti', 'Aarti & reminders'], ...(user.role === 'admin' ? [['admin', 'Temple admin']] : [])];
  const sendRep = async () => { try { await api.report(mins); toast('Thanks. The forecast now uses your report.'); setRep(false); } catch (e) { toast(e.message); } };
  const reset = async () => {
    if (!window.confirm('Delete your demo account and bookings?')) return;
    try { await api.deleteMe(); logout(); toast('Demo data cleared.'); } catch (e) { toast(e.message); }
  };

  return (
    <PortalCtx.Provider value={{ go, day, setDay, askReport: () => { setMins(20); setRep(true); } }}>
      <header className="top"><div className="wrap">
        <span className="logo">Darshan<b>Q</b></span>
        <div className="row"><span className="mut sm">{user.name}</span><button className="btn sm" onClick={logout}>Sign out</button></div>
      </div></header>
      <div className="wrap layout">
        <aside className="side">
          <small className="mut">DEVOTEE PORTAL</small>
          <div>{menu.map(m => <button key={m[0]} className={m[0] === view ? 'on' : ''} onClick={() => go(m[0])}>{m[1]}</button>)}</div>
          <hr style={{ border: 0, borderTop: '1px solid #ffffff22', margin: '12px 0' }} />
          <button onClick={reset}>Reset demo data</button>
        </aside>
        <section aria-live="polite">
          {view === 'overview' && <Overview fs={fs} cfg={cfg} />}
          {view === 'book' && <Book fs={fs} setFs={setFs} cfg={cfg} />}
          {view === 'passes' && <Passes />}
          {view === 'trust' && <Trust />}
          {view === 'aarti' && <Aarti cfg={cfg} />}
          {view === 'admin' && user.role === 'admin' && <Admin onConfig={loadCfg} />}
        </section>
      </div>
      <Modal open={rep} onClose={() => setRep(false)}>
        <h3>How long did you wait?</h3>
        <p className="sm mut">Your report improves the crowd forecast for everyone.</p>
        <label htmlFor="rm">Minutes in queue: <b>{mins}</b></label>
        <input type="range" id="rm" min="5" max="240" step="5" value={mins} onChange={e => setMins(+e.target.value)} />
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri" onClick={sendRep}>Submit report</button><button className="btn sm" onClick={() => setRep(false)}>Skip</button></div>
      </Modal>
    </PortalCtx.Provider>
  );
}
