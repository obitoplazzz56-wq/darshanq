import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, setToken, hasToken } from './api';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Portal from './pages/Portal.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(hasToken());
  const [loginOpen, setLoginOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef();

  const toast = useCallback(t => { setMsg(t); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 3200); }, []);
  const refresh = useCallback(() => api.me().then(setUser), []);
  const logout = useCallback(() => { setToken(null); setUser(null); window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!hasToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setBooting(false));
  }, []);

  if (booting) return <div className="wrap" style={{ padding: 60 }}><p className="mut">Loading…</p></div>;

  return (
    <AppCtx.Provider value={{ user, setUser, refresh, logout, toast }}>
      {user ? <Portal /> : <Landing onLogin={() => setLoginOpen(true)} />}
      <Login open={loginOpen && !user} onClose={() => setLoginOpen(false)} />
      {msg && <div className="toast" role="status">{msg}</div>}
    </AppCtx.Provider>
  );
}
