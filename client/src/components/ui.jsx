import { useEffect, useState } from 'react';
import { api } from '../api';
import { hm } from '../util';

export function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mbg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

// Live crowd numbers + hourly forecast, refreshed every 5s
export function useCrowd(festival) {
  const [c, setC] = useState(null);
  useEffect(() => {
    let on = true;
    const load = () => api.crowd(festival).then(d => on && setC(d)).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { on = false; clearInterval(t); };
  }, [festival]);
  return c;
}

export function Forecast({ data, festival }) {
  if (!data) return null;
  const best = data.forecast.reduce((a, b) => (b.wait < a.wait ? b : a));
  return (
    <>
      <svg className="chart" viewBox="0 0 480 170" role="img" aria-label="Predicted crowd by hour">
        {data.forecast.map((p, i) => {
          const ht = Math.min(110, p.wait / 3);
          const c = p.hour === best.hour ? '#3ecf7a' : p.wait < 90 ? '#8fd1a8' : p.wait < 180 ? '#f0b429' : '#e0603a';
          return (
            <g key={p.hour}>
              <rect x={i * 30 + 8} y={130 - ht} width="22" height={ht} rx="3" fill={c} />
              <text x={i * 30 + 19} y="148" textAnchor="middle">{p.hour % 12 || 12}{p.hour < 12 ? 'a' : 'p'}</text>
            </g>
          );
        })}
      </svg>
      <p className="sm mut" style={{ margin: '6px 0 0' }}>
        Best window: {best.label} (about {hm(best.wait)} general wait). Avoid 9 AM to 12 PM{festival ? ' on festival days' : ''}.
      </p>
    </>
  );
}

export const Ring = ({ v }) => (
  <div className="ring" style={{ '--v': v }}>
    <div><b className="big">{v}</b><span className="sm mut">/100</span></div>
  </div>
);

export function Banner({ cfg }) {
  if (!cfg) return null;
  return (
    <>
      {cfg.paused && <div className="lane" style={{ borderColor: 'var(--bad)' }}><b>Free lane paused by the temple.</b> <span className="mut">Bookings reopen when it resumes.</span></div>}
      {cfg.announcement && <div className="lane on"><b>Temple notice:</b> <span className="mut">{cfg.announcement}</span></div>}
    </>
  );
}
