import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login } = useApp();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const f = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      // Use explicit full URL - avoids CRA proxy issues
      const res = await axios.post('/api/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password
      });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={28} color="white" /></div>
          <div className="auth-title">QuoteFlow</div>
          <div className="auth-sub">LED Solutions Pro</div>
        </div>

        {error && (
          <div className="auth-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input type="email" value={form.email}
                onChange={e => f('email', e.target.value)}
                placeholder="you@company.com"
                autoComplete="email" autoFocus />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Password</label>
            <div className="auth-input-wrap" style={{ position:'relative' }}>
              <Lock size={15} className="auth-input-icon" />
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => f('password', e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                style={{ paddingRight:40 }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:0, display:'flex' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop:4 }}>
            {loading ? '⏳ Signing in…' : <><Zap size={16} /> Sign In</>}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop:20 }}>
          No account yet?{' '}
          <Link to="/register" className="auth-link">Create one free</Link>
        </div>

        <div style={{ marginTop:16, padding:'10px 13px', background:'rgba(99,102,241,0.1)', borderRadius:8, border:'1px solid rgba(99,102,241,0.2)', textAlign:'center' }}>
          <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
            First time setup?<br />
            <Link to="/register" className="auth-link">Register here</Link> to create your account.
          </p>
        </div>
      </div>
    </div>
  );
}
