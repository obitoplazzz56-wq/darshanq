import { useEffect, useState } from 'react';
import { api, setToken } from '../api';
import { useApp } from '../App.jsx';
import { Modal } from '../components/ui.jsx';

export default function Login({ open, onClose }) {
  const { setUser, toast } = useApp();
  const [f, setF] = useState({ name: '', phone: '', pincode: '' });
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setStep(1); setErr(''); setOtp(''); } }, [open]);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const send = async () => {
    setErr(''); setBusy(true);
    try { const r = await api.sendOtp(f); setDemoOtp(r.demoOtp); setStep(2); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const verify = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api.verify({ ...f, otp });
      setToken(r.token); setUser(r.user); onClose();
      if (!r.user.local) toast('Your pincode is outside Ujjain, so the free lane is locked. You can still use forecasts.');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>{step === 1 ? 'Enter the demo' : 'Verify your number'}</h3>
      <p className="sm mut">{step === 1 ? 'Verification is simulated. Do not enter real Aadhaar information.' : `We sent a code to +91 ${f.phone.slice(0, 2)}••••••${f.phone.slice(-2)}.`}</p>
      {step === 1 ? (
        <>
          <label htmlFor="ln">Full name</label><input id="ln" autoComplete="name" value={f.name} onChange={set('name')} />
          <label htmlFor="lp">Mobile number</label><input id="lp" type="tel" inputMode="numeric" maxLength={10} placeholder="10 digits, starting 6–9" value={f.phone} onChange={set('phone')} />
          <label htmlFor="lz">Pincode</label><input id="lz" inputMode="numeric" maxLength={6} placeholder="e.g. 456001 for Ujjain" value={f.pincode} onChange={set('pincode')} />
          <div className="err">{err}</div>
          <button className="btn pri" style={{ width: '100%' }} disabled={busy} onClick={send}>Send OTP</button>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setF({ name: 'Rohan Sharma', phone: '9826012345', pincode: '456001' })}>Use demo local profile</button>
        </>
      ) : (
        <>
          <label htmlFor="lo">One-time code</label>
          <input id="lo" inputMode="numeric" maxLength={6} placeholder="6 digits" value={otp} onChange={e => setOtp(e.target.value)} />
          <p className="sm mut">Demo code: <b>{demoOtp}</b></p>
          <div className="err">{err}</div>
          <button className="btn pri" style={{ width: '100%' }} disabled={busy} onClick={verify}>Verify and open dashboard</button>
        </>
      )}
      <button className="btn sm" style={{ marginTop: 12 }} onClick={onClose}>Cancel</button>
    </Modal>
  );
}
