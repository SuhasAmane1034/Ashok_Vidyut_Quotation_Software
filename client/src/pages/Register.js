import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Register() {
  const { login } = useApp();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ name:'', email:'', password:'', confirm:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const f = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())          { setError('Please enter your name'); return; }
    if (!form.email.trim())         { setError('Please enter your email'); return; }
    if (!form.password)             { setError('Please enter a password'); return; }
    if (form.password.length < 6)   { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true); setError('');
    try {
      // Use explicit full URL - avoids CRA proxy issues
      const res = await axios.post('/api/auth/register', {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password
      });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed';
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
          <div className="auth-title">Create Account</div>
          <div className="auth-sub">Start managing your LED quotations</div>
        </div>

        {error && (
          <div className="auth-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Full Name</label>
            <div className="auth-input-wrap">
              <User size={15} className="auth-input-icon" />
              <input type="text" value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="Your full name" autoFocus />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input type="email" value={form.email}
                onChange={e => f('email', e.target.value)}
                placeholder="you@company.com" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Password (min 6 characters)</label>
            <div className="auth-input-wrap" style={{ position:'relative' }}>
              <Lock size={15} className="auth-input-icon" />
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => f('password', e.target.value)}
                placeholder="Create a password"
                style={{ paddingRight:40 }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:0, display:'flex' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ color:'rgba(255,255,255,0.55)' }}>Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input type="password" value={form.confirm}
                onChange={e => f('confirm', e.target.value)}
                placeholder="Repeat your password" />
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop:4 }}>
            {loading ? '⏳ Creating account…' : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop:20 }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
