import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../App.jsx';

const LABEL = { booked: 'Booked', done: 'Checked in', noshow: 'No-show', cancelled: 'Cancelled' };

export default function Admin({ onConfig }) {
  const { toast, tid } = useApp();
  const [d, setD] = useState(null), [an, setAn] = useState('');

  const load = useCallback(() => api.dashboard(tid).then(x => { setD(x); setAn(x.config.announcement); }).catch(e => toast(e.message)), [toast, tid]);
  useEffect(() => { setD(null); load(); }, [load]);

  const update = async (patch, msg) => {
    try { await api.setConfig(patch, tid); toast(msg); await load(); onConfig(); } catch (e) { toast(e.message); }
  };
  const noShow = async id => { try { await api.noShow(id); toast('No-show recorded. Trust score −10, place released.'); load(); } catch (e) { toast(e.message); } };
  const exportCsv = async () => {
    try {
      const url = URL.createObjectURL(await api.exportCsv(tid));
      const a = document.createElement('a'); a.href = url; a.download = `darshanq-${tid}-bookings.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast(e.message); }
  };

  if (!d) return <p className="mut">Loading dashboard…</p>;
  const { config: c, stats } = d;
  return (
    <>
      <div className="row sp"><h2>Operations dashboard · {d.temple}</h2><span className="pill">Live</span></div>
      <div className="g4" style={{ marginTop: 14 }}>
        <div className="card"><div className="sm mut">General queue</div><b className="big">{d.queue.toLocaleString('en-IN')}</b></div>
        <div className="card"><div className="sm mut">Local bookings today</div><b className="big">{stats.bookingsToday}</b></div>
        <div className="card"><div className="sm mut">Checked in</div><b className="big">{stats.checkedInPct}%</b></div>
        <div className="card"><div className="sm mut">No-show rate</div><b className="big">{stats.noShowPct}%</b></div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Controls</h3>
        <div className="row">
          <button className={`btn sm ${c.paused ? 'pri' : ''}`} onClick={() => update({ paused: !c.paused }, 'Setting updated.')}>{c.paused ? 'Resume free lane' : 'Pause free lane'}</button>
          <label className="row sm" style={{ margin: 0, gap: 8 }}>Places per slot
            <select style={{ width: 'auto' }} value={c.cap} onChange={e => update({ cap: +e.target.value }, 'Setting updated.')}>
              {[8, 10, 14, 18].map(n => <option key={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn sm" onClick={exportCsv}>Export bookings (CSV)</button>
        </div>
        <label htmlFor="an">Announcement for devotees</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="an" value={an} maxLength={120} placeholder="e.g. Gate 2 closed for cleaning until 11 AM" onChange={e => setAn(e.target.value)} />
          <button className="btn sm dk" onClick={() => update({ announcement: an }, an.trim() ? 'Announcement published.' : 'Announcement cleared.')}>Publish</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Slot utilisation, today</h3>
        {d.utilisation.map(u => (
          <div key={u.time} className="row sm" style={{ margin: '8px 0', flexWrap: 'nowrap' }}>
            <span style={{ width: 76 }}>{u.time}</span>
            <div className="bar" style={{ flex: 1 }}><i style={{ width: u.pct + '%', ...(u.pct > 85 ? { background: 'var(--bad)' } : {}) }} /></div>
            <b style={{ width: 42, textAlign: 'right' }}>{u.pct}%</b>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Today's bookings</h3>
        <div style={{ overflowX: 'auto' }}><table>
          <thead><tr><th>Devotee</th><th>Slot</th><th>Party</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {d.bookings.length === 0 && <tr><td colSpan="5" className="mut">No bookings yet today.</td></tr>}
            {d.bookings.map(b => (
              <tr key={b.id}><td>{b.name}</td><td>{b.time}</td><td>{b.party}</td><td>{LABEL[b.status]}</td>
                <td>{b.status === 'booked' && <button className="btn sm" onClick={() => noShow(b.id)}>Mark no-show</button>}</td></tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
