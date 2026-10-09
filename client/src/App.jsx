import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, setToken, hasToken } from './api';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Portal from './pages/Portal.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [temples, setTemples] = useState([]);
  const [tid, setTidState] = useState(localStorage.getItem('dq_temple') || 'mahakaleshwar');
  const [booting, setBooting] = useState(hasToken());
  const [loginOpen, setLoginOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef();

  const toast = useCallback(t => { setMsg(t); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 3200); }, []);
  const setTid = useCallback(id => { localStorage.setItem('dq_temple', id); setTidState(id); }, []);
  const refresh = useCallback(() => api.me(tid).then(setUser), [tid]);
  const logout = useCallback(() => { setToken(null); setUser(null); window.scrollTo(0, 0); }, []);

  // load the temple list; fall back to the first temple if the saved choice no longer exists
  useEffect(() => {
    api.temples().then(list => { setTemples(list); if (list.length && !list.some(t => t.id === tid)) setTid(list[0].id); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // restore a saved session
  useEffect(() => {
    if (!hasToken()) return;
    api.me(tid).then(setUser).catch(() => setToken(null)).finally(() => setBooting(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the trust score, eligibility and history are per temple, so reload when the temple changes
  useEffect(() => {
    if (user) api.me(tid).then(setUser).catch(() => {});
  }, [tid]); // eslint-disable-line react-hooks/exhaustive-deps

  const temple = temples.find(t => t.id === tid) || { id: tid, name: '…', city: '', aarti: [] };

  if (booting) return <div className="wrap" style={{ padding: 60 }}><p className="mut">Loading…</p></div>;

  return (
    <AppCtx.Provider value={{ user, setUser, refresh, logout, toast, temples, temple, tid, setTid }}>
      {user ? <Portal /> : <Landing onLogin={() => setLoginOpen(true)} />}
      <Login open={loginOpen && !user} onClose={() => setLoginOpen(false)} />
      {msg && <div className="toast" role="status">{msg}</div>}
    </AppCtx.Provider>
  );
}
