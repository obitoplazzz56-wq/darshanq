import { useState } from 'react';
import { Forecast, useCrowd } from '../components/ui.jsx';
import { calcScore, hm, tierOf } from '../util';

export default function Landing({ onLogin }) {
  const [fs, setFs] = useState(false);
  const crowd = useCrowd(fs);
  const [c, setC] = useState(6), [st, setSt] = useState(2), [ns, setNs] = useState(0);
  const v = calcScore(c, st, ns);

  return (
    <>
      <header className="top"><div className="wrap">
        <a className="logo" href="#home">Darshan<b>Q</b></a>
        <nav className="links">
          <a href="#lanes">Three lanes</a><a href="#score">Trust score</a><a href="#flow">How it works</a><a href="#safe">Safeguards</a>
          <button className="btn pri sm" onClick={onLogin}>Check my eligibility</button>
        </nav>
      </div></header>

      <main id="home">
        <section className="hero"><div className="wrap g2" style={{ alignItems: 'center' }}>
          <div>
            <p className="sm" style={{ fontWeight: 700, color: 'var(--saf)' }}>Free priority for verified local devotees</p>
            <h1>Regular devotion deserves a place in the queue.</h1>
            <p className="lead">Today you either pay for VIP or wait in the general line. DarshanQ adds a free third lane, earned through verified, completed visits rather than money or who books first.</p>
            <div className="row" style={{ marginTop: 24 }}>
              <button className="btn pri" onClick={onLogin}>Check my eligibility</button>
              <a className="btn" href="#score">Try the score calculator</a>
            </div>
          </div>
          <div className="card dark">
            <div className="row sp">
              <span><span className="dot"></span>Live demo · Mahakaleshwar</span>
              <label className="sm row" style={{ margin: 0, gap: 6, fontWeight: 500 }}>
                <input type="checkbox" checked={fs} onChange={e => setFs(e.target.checked)} /> Festival day
              </label>
            </div>
            <div className="row" style={{ gap: 28, margin: '14px 0' }}>
              <div><div className="sm mut">In general queue</div><div className="big">{crowd ? crowd.queue.toLocaleString('en-IN') : '…'}</div></div>
              <div><div className="sm mut">General wait</div><div className="big">{crowd ? hm(crowd.generalWait) : '…'}</div></div>
              <div><div className="sm mut">Local lane wait</div><div className="big">{crowd ? hm(crowd.localWait) : '…'}</div></div>
            </div>
            <Forecast data={crowd} festival={fs} />
          </div>
        </div></section>

        <section className="s" id="lanes"><div className="wrap g2">
          <div>
            <h2>The missing third lane</h2>
            <p className="mut" style={{ fontSize: 18 }}>A local who visits every week for years gets no recognition for it. DarshanQ ranks priority by one signal that is hard to fake: <b>completed, verified check-ins.</b></p>
          </div>
          <div>
            <div className="lane"><b>Paid VIP</b> <span className="mut">· priority through payment</span></div>
            <div className="lane"><b>General queue</b> <span className="mut">· open to all, waits swing with the crowd</span></div>
            <div className="lane on"><b>DarshanQ Local Priority</b> <span className="mut">· free, capacity-capped, earned by regular visits</span></div>
          </div>
        </div></section>

        <section className="s alt" id="score"><div className="wrap g2" style={{ alignItems: 'start' }}>
          <div>
            <h2>How the trust score works</h2>
            <p className="mut" style={{ fontSize: 18 }}>Priority unlocks at <b>60</b>. Bookings alone never raise the score. Only completed check-ins do, and no-shows cost more than cancelling early.</p>
            <table className="sm"><tbody>
              <tr><th>Signal</th><th>Effect</th></tr>
              <tr><td>Verified local base</td><td>+30</td></tr>
              <tr><td>Completed check-in (max 10)</td><td>+5 each</td></tr>
              <tr><td>Weekly streak (max 6)</td><td>+2 each</td></tr>
              <tr><td>Late cancel (under 2h)</td><td>−4</td></tr>
              <tr><td>No-show</td><td>−10</td></tr>
            </tbody></table>
          </div>
          <div className="card">
            <h3>Try it</h3>
            <label>Completed check-ins: <b>{c}</b></label><input type="range" min="0" max="12" value={c} onChange={e => setC(+e.target.value)} />
            <label>Weekly streak: <b>{st}</b></label><input type="range" min="0" max="8" value={st} onChange={e => setSt(+e.target.value)} />
            <label>No-shows: <b>{ns}</b></label><input type="range" min="0" max="4" value={ns} onChange={e => setNs(+e.target.value)} />
            <div className="ring" style={{ '--v': v }}><div><b className="big">{v}</b><span className="sm mut">{tierOf(v)}</span></div></div>
            <p className="sm mut" style={{ textAlign: 'center' }}>{v >= 60 ? 'Eligible for the free priority lane.' : `${60 - v} more points to unlock the free lane.`}</p>
          </div>
        </div></section>

        <section className="s" id="flow"><div className="wrap">
          <h2>From identity to a reserved slot</h2>
          <div className="g4" style={{ marginTop: 28 }}>
            <div className="card"><h3>1. Verify</h3><p className="mut sm">Mobile OTP and one account per devotee. The demo simulates this, so never enter real Aadhaar details.</p></div>
            <div className="card"><h3>2. Confirm locality</h3><p className="mut sm">A local pincode opens the free lane. Visitors still get crowd forecasts and general guidance.</p></div>
            <div className="card"><h3>3. Check in</h3><p className="mut sm">Check-in opens 30 minutes before your slot. Only completed visits grow your score.</p></div>
            <div className="card"><h3>4. Reserve</h3><p className="mut sm">Pick a day and time. Each slot has capped places, so the free lane never swamps the general one.</p></div>
          </div>
        </div></section>

        <section className="s" id="more"><div className="wrap">
          <h2>Everything a visit needs</h2>
          <div className="g4" style={{ marginTop: 24 }}>
            <div className="card"><h3>Family booking</h3><p className="mut sm">Reserve for up to 4 people, with senior and wheelchair assistance flagged.</p></div>
            <div className="card"><h3>Crowd-reported waits</h3><p className="mut sm">Devotees report real waits after check-in. The forecast learns from them.</p></div>
            <div className="card"><h3>Temple controls</h3><p className="mut sm">Admins pause the lane, change capacity and broadcast notices.</p></div>
            <div className="card"><h3>Reminders and badges</h3><p className="mut sm">Pass, reminders and recognition for consistent visits.</p></div>
          </div>
        </div></section>

        <section className="s alt" id="safe"><div className="wrap g2">
          <div><h2>Built to resist gaming</h2></div>
          <div>
            <div className="lane"><b>One booking per day</b> <span className="mut">stops slot hoarding.</span></div>
            <div className="lane"><b>Check-in window</b> <span className="mut">stops remote or early check-ins.</span></div>
            <div className="lane"><b>No-show penalty</b> <span className="mut">frees capacity and protects genuine devotees.</span></div>
            <div className="lane"><b>Quota per slot</b> <span className="mut">keeps the general queue moving.</span></div>
          </div>
        </div></section>
      </main>
      <footer><div className="wrap row sp"><span><b>DarshanQ</b> · MU ANANT 1.0</span><span>Competition prototype. Demo data only.</span></div></footer>
    </>
  );
}
