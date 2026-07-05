import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../api/config';

const AppContext = createContext();

// ── Dynamic base URL — works from localhost AND any LAN device ──
// window.location.hostname automatically resolves to whatever IP
// the device used to open the app, so no hardcoding needed.
axios.defaults.baseURL = API_BASE;

// ── Attach JWT token to every request ────────────────────
axios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('qf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Response interceptor - auto logout on 401 ────────────
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && localStorage.getItem('qf_token')) {
      // Token expired - clear and redirect
      localStorage.removeItem('qf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function AppProvider({ children }) {
  const [token, setToken]     = useState(localStorage.getItem('qf_token'));
  const [user, setUser]       = useState(null);
  const [settings, setSettings] = useState(null);
  const [toasts, setToasts]   = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  const login = useCallback((tkn, usr) => {
    localStorage.setItem('qf_token', tkn);
    setToken(tkn);
    setUser(usr);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('qf_token');
    setToken(null);
    setUser(null);
    setSettings(null);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!localStorage.getItem('qf_token')) return;
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
      const dm = res.data.dark_mode === true || res.data.dark_mode === 'true';
      setDarkMode(dm);
      document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light');
      if (res.data.accent_color) {
        document.documentElement.style.setProperty('--accent', res.data.accent_color);
      }
    } catch (e) {
      console.warn('Could not load settings:', e.message);
    }
  }, []);

  const updateSettings = useCallback(async (updates) => {
    try {
      await axios.put('/api/settings', updates);
      setSettings(prev => ({ ...prev, ...updates }));
      if (updates.dark_mode !== undefined) {
        const dm = updates.dark_mode === true || updates.dark_mode === 'true';
        setDarkMode(dm);
        document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light');
      }
      if (updates.accent_color) {
        document.documentElement.style.setProperty('--accent', updates.accent_color);
      }
      addToast('Settings saved!', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    }
  }, []);

  // Load user profile when token exists
  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me')
        .then(r => setUser(r.data))
        .catch(() => logout());
    }
  }, [token, logout]);

  // Load settings when logged in
  useEffect(() => {
    if (token) fetchSettings();
  }, [token, fetchSettings]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ token, user, login, logout, settings, updateSettings, fetchSettings, addToast, darkMode }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => onRemove(t.id)}>
          <span className="toast-icon">{icons[t.type] || '✓'}</span>
          <div style={{ whiteSpace: 'pre-line', flex: 1 }}>{t.message}</div>
        </div>
      ))}
    </div>
  );
}

export function useApp() { return useContext(AppContext); }
