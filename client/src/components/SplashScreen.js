import React, { useEffect, useState } from 'react';

export default function SplashScreen({ userName, onDone }) {
  const [phase, setPhase] = useState('enter'); // enter → stay → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('stay'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 2400);
    const t3 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6366f1 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      opacity: phase === 'exit' ? 0 : phase === 'stay' ? 1 : 0,
      transform: phase === 'exit' ? 'scale(1.04)' : 'scale(1)',
      pointerEvents: phase === 'exit' ? 'none' : 'all',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)', top: -100, right: -100,
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', bottom: -50, left: -50,
      }} />

      {/* Logo / Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        border: '1.5px solid rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        transition: 'transform 0.6s cubic-bezier(.34,1.56,.64,1)',
        transform: phase === 'stay' ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
      }}>
        ⚡
      </div>

      {/* App name */}
      <div style={{
        fontSize: 13, fontWeight: 600, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
        marginBottom: 8,
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        opacity: phase === 'stay' ? 1 : 0,
        transform: phase === 'stay' ? 'translateY(0)' : 'translateY(10px)',
      }}>
        QuoteFlow
      </div>

      {/* Welcome message */}
      <div style={{
        fontSize: 32, fontWeight: 700, color: '#fff',
        letterSpacing: '-0.5px', textAlign: 'center',
        marginBottom: 8,
        transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
        opacity: phase === 'stay' ? 1 : 0,
        transform: phase === 'stay' ? 'translateY(0)' : 'translateY(12px)',
      }}>
        Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
      </div>

      <div style={{
        color: 'rgba(255,255,255,0.55)', fontSize: 15,
        transition: 'opacity 0.6s ease 0.3s',
        opacity: phase === 'stay' ? 1 : 0,
        marginBottom: 48,
      }}>
        Let's build something great today
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 3, borderRadius: 99,
        background: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
        transition: 'opacity 0.4s ease 0.4s',
        opacity: phase === 'stay' ? 1 : 0,
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.6), #fff)',
          transition: 'width 2s cubic-bezier(.4,0,.2,1)',
          width: phase === 'stay' ? '100%' : '0%',
        }} />
      </div>
    </div>
  );
}
