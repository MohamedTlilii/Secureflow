'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import axios from 'axios';

// ─── Logo (même que sidebar) ─────────────────────────────────────────────────
function LogoIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}
      style={{ filter:'drop-shadow(0 0 8px rgba(18,183,106,0.95)) drop-shadow(0 0 18px rgba(6,182,212,0.6))' }}>
      <circle cx="10" cy="6" r="4" fill="white"/>
      <path d="M6 12 Q10 10 14 12 L13 22 H7 Z" fill="white"/>
      <path d="M14 14 Q20 11 25 13" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M24 11 Q27 12 26 15 Q23 16 22 14" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="9" r="3.5" fill="none" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}

// ─── Données statiques déterministes (pas de Math.random → pas de problème hydratation) ───

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,
  y: (i * 97.31) % 100,
  size: i % 5 === 0 ? 2 : i % 3 === 0 ? 1.2 : 0.7,
  delay: (i * 0.16) % 8,
  dur: 3 + (i % 5) * 0.6,
}));

const LABELS = [
  { t: '+2 450 TND',  x: 5,  y: 13, d: 0,   dur: 18, c: 'rgba(18,183,106,0.09)'  },
  { t: 'Carburant',   x: 79, y: 19, d: 1.6, dur: 15, c: 'rgba(97,218,251,0.08)'  },
  { t: '47 j/ouvrés', x: 12, y: 71, d: 2.4, dur: 22, c: 'rgba(167,139,250,0.08)' },
  { t: 'Commission',  x: 72, y: 64, d: 0.9, dur: 19, c: 'rgba(245,158,11,0.08)'  },
  { t: '5 TND/jour',  x: 4,  y: 43, d: 3.3, dur: 20, c: 'rgba(97,218,251,0.07)'  },
  { t: 'Pipeline ×6', x: 85, y: 41, d: 1.9, dur: 17, c: 'rgba(236,72,153,0.07)'  },
  { t: 'Q2 · 2026',   x: 43, y: 87, d: 2.7, dur: 21, c: 'rgba(167,139,250,0.07)' },
  { t: '+850 TND',    x: 57, y: 7,  d: 0.6, dur: 16, c: 'rgba(18,183,106,0.09)'  },
  { t: 'Installé ✓',  x: 25, y: 91, d: 4.1, dur: 19, c: 'rgba(18,183,106,0.08)'  },
  { t: '94 % reçu',   x: 90, y: 77, d: 1.2, dur: 22, c: 'rgba(245,158,11,0.08)'  },
];

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  x: (i * 163.7) % 100,
  y: (i * 89.3)  % 100,
  dur: 9 + (i % 11),
  del: (i * 0.42) % 7,
  sz: i % 5 === 0 ? 5 : i % 3 === 0 ? 3 : 2,
  col: i % 4 === 0
    ? 'rgba(18,183,106,0.45)'
    : i % 4 === 1
    ? 'rgba(97,218,251,0.38)'
    : i % 4 === 2
    ? 'rgba(167,139,250,0.38)'
    : 'rgba(245,158,11,0.28)',
}));

// ─── Composant accent coins ───────────────────────────────────────────────────

function CornerAccents({ color }: { color: string }) {
  const s: React.CSSProperties = { position: 'absolute', width: 10, height: 10, pointerEvents: 'none', zIndex: 3 };
  const b = `1.8px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: -1,    left: -1,  borderTop: b,    borderLeft: b,  borderRadius: '3px 0 0 0' }} />
      <div style={{ ...s, top: -1,    right: -1, borderTop: b,    borderRight: b, borderRadius: '0 3px 0 0' }} />
      <div style={{ ...s, bottom: -1, left: -1,  borderBottom: b, borderLeft: b,  borderRadius: '0 0 0 3px' }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b, borderRadius: '0 0 3px 0' }} />
    </>
  );
}

// ─── Page Login ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState('');
  const [mounted,  setMounted]  = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 });
  const [aurora,   setAurora]   = useState({ x: 50, y: 50 });

  const cardRef = useRef<HTMLDivElement>(null);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Aurora souris (global)
  useEffect(() => {
    const h = (e: MouseEvent) => setAurora({
      x: (e.clientX / window.innerWidth)  * 100,
      y: (e.clientY / window.innerHeight) * 100,
    });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // Redirect si déjà connecté
  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [authLoading, user, router]);

  // Tilt 3D sur la card
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 2,
      y: ((e.clientY - r.top)  / r.height - 0.5) * 2,
    });
  }, []);

  const onMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Bienvenue !');
      setTimeout(() => { router.push('/'); }, 300);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Erreur de connexion');
      } else {
        toast.error('Erreur de connexion — réessaie');
      }
    } finally {
      setLoading(false);
    }
  };

  const iStyle = (f: string, c: string): React.CSSProperties => ({
    width: '100%', padding: '14px 46px 14px 44px', borderRadius: 13,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    background: focused === f ? `${c}0d` : 'rgba(255,255,255,0.028)',
    color: '#f0f4ff',
    border: focused === f ? `1.5px solid ${c}` : '1.5px solid rgba(255,255,255,0.065)',
    boxShadow: focused === f
      ? `0 0 0 3px ${c}15,inset 0 1px 0 rgba(255,255,255,0.04)`
      : 'inset 0 1px 0 rgba(255,255,255,0.02)',
    transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
  });

  const tiltTr  = `perspective(1300px) rotateX(${-tilt.y * 12}deg) rotateY(${tilt.x * 12}deg)`;
  const tiltTrs = tilt.x === 0 && tilt.y === 0
    ? 'transform 0.9s cubic-bezier(0.23,1,0.32,1)'
    : 'transform 0.07s ease';

  if (authLoading) return <div style={{ minHeight: '100vh', background: '#030a16' }} />;

  return (
    <div style={{ minHeight: '100vh', background: '#030a16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        @keyframes starBlink  { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:0.8;transform:scale(1.4)} }
        @keyframes orb1       { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(55px,-42px)scale(1.1)} }
        @keyframes orb2       { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(-48px,38px)scale(0.92)} }
        @keyframes orb3       { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-55px)} }
        @keyframes labelFloat { 0%,100%{opacity:0.85;transform:translateY(0)} 50%{opacity:1;transform:translateY(-18px)} }
        @keyframes ptDrift    { 0%{transform:translateY(0)translateX(0)scale(1);opacity:0.5} 33%{transform:translateY(-28px)translateX(16px)scale(1.5);opacity:0.85} 66%{transform:translateY(-12px)translateX(-12px)scale(0.7);opacity:0.4} 100%{transform:translateY(0)translateX(0)scale(1);opacity:0.5} }
        @keyframes hexPulse   { 0%,100%{opacity:0.45} 50%{opacity:0.98} }
        @keyframes drawChart  { 0%{stroke-dashoffset:74} 48%{stroke-dashoffset:0} 58%{stroke-dashoffset:0} 100%{stroke-dashoffset:74} }
        @keyframes dotPulse   { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.9);opacity:1} }
        @keyframes fuelBounce { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
        @keyframes logoPulse  { 0%,100%{box-shadow:0 0 48px rgba(18,183,106,0.38),0 0 110px rgba(18,183,106,0.14),0 0 180px rgba(97,218,251,0.06)} 50%{box-shadow:0 0 72px rgba(18,183,106,0.68),0 0 150px rgba(18,183,106,0.24),0 0 250px rgba(97,218,251,0.12)} }
        @keyframes ringPulse  { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.07)} }
        @keyframes wordFlash  { 0%{opacity:0;transform:translateY(18px)scale(0.9);filter:blur(5px)} 18%{opacity:1;transform:translateY(0)scale(1);filter:blur(0)} 80%{opacity:1} 100%{opacity:0;transform:translateY(-15px)scale(0.95);filter:blur(3px)} }
        @keyframes blink      { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes shimmer    { 0%{transform:translateX(-150%)} 100%{transform:translateX(380%)} }
        @keyframes scanV      { 0%{transform:translateY(-20vh);opacity:0} 6%{opacity:0.8} 94%{opacity:0.8} 100%{transform:translateY(120vh);opacity:0} }
        @keyframes cornerGlow { 0%,100%{opacity:0.2} 50%{opacity:0.58} }
      `}</style>

      {/* Signature */}
      <div style={{ position:'fixed', bottom:28, right:36, zIndex:2, pointerEvents:'none', display:'flex', alignItems:'center', gap:12 }}>
        <LogoIcon size={34} />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <span style={{ fontFamily:"'Dancing Script', cursive", fontSize:28, fontWeight:700, color:'rgba(18,183,106,0.45)', lineHeight:1, letterSpacing:1, textShadow:'0 0 18px rgba(18,183,106,0.25)' }}>
            Mohamed Tlili
          </span>
          <svg width="130" height="10" viewBox="0 0 130 10">
            <path d="M4,7 C30,2 70,9 126,5" fill="none" stroke="rgba(18,183,106,0.35)" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="126" cy="5" r="2" fill="rgba(18,183,106,0.4)"/>
          </svg>
        </div>
      </div>

      {/* Coins HUD */}
      <div style={{ position: 'fixed', top: 20, left: 20,   width: 28, height: 28, borderTop:    '1.5px solid rgba(18,183,106,0.25)', borderLeft:  '1.5px solid rgba(18,183,106,0.25)', pointerEvents: 'none', zIndex: 0, animation: 'cornerGlow 4s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', top: 20, right: 20,  width: 28, height: 28, borderTop:    '1.5px solid rgba(97,218,251,0.22)',  borderRight: '1.5px solid rgba(97,218,251,0.22)',  pointerEvents: 'none', zIndex: 0, animation: 'cornerGlow 4s 1s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: 20, left: 20,  width: 28, height: 28, borderBottom: '1.5px solid rgba(97,218,251,0.22)',  borderLeft:  '1.5px solid rgba(97,218,251,0.22)',  pointerEvents: 'none', zIndex: 0, animation: 'cornerGlow 4s 2s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: 20, right: 20, width: 28, height: 28, borderBottom: '1.5px solid rgba(18,183,106,0.25)', borderRight: '1.5px solid rgba(18,183,106,0.25)', pointerEvents: 'none', zIndex: 0, animation: 'cornerGlow 4s 3s ease-in-out infinite' }} />

      {/* Aurora souris */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 80% 60% at ${aurora.x}% ${aurora.y}%,rgba(18,183,106,0.038) 0%,transparent 65%)`, transition: 'background 1.3s ease' }} />

      {/* Orbes */}
      <div style={{ position: 'absolute', top: '-18%',   left: '-10%',  width: 800, height: 700, background: 'radial-gradient(ellipse,rgba(18,183,106,0.075) 0%,transparent 65%)', borderRadius: '50%', animation: 'orb1 19s ease-in-out infinite',     pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-14%', right: '-11%', width: 880, height: 800, background: 'radial-gradient(ellipse,rgba(97,218,251,0.055) 0%,transparent 65%)', borderRadius: '50%', animation: 'orb2 23s 3s ease-in-out infinite',   pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '28%',    right: '3%',   width: 500, height: 500, background: 'radial-gradient(ellipse,rgba(245,158,11,0.04)  0%,transparent 65%)', borderRadius: '50%', animation: 'orb3 15s 6s ease-in-out infinite',   pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '8%',     left: '30%',   width: 360, height: 360, background: 'radial-gradient(ellipse,rgba(167,139,250,0.04)  0%,transparent 65%)', borderRadius: '50%', animation: 'orb1 12s 2s ease-in-out infinite',   pointerEvents: 'none' }} />

      {/* Grille */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.38, backgroundImage: 'linear-gradient(rgba(18,183,106,0.048) 1px,transparent 1px),linear-gradient(90deg,rgba(18,183,106,0.048) 1px,transparent 1px)', backgroundSize: '58px 58px' }} />

      {/* Scan lines */}
      <div style={{ position: 'absolute', left: '22%', top: 0, width: 1, height: '38%', background: 'linear-gradient(180deg,transparent,rgba(18,183,106,0.5),rgba(18,183,106,0.72),rgba(18,183,106,0.5),transparent)', pointerEvents: 'none', animation: 'scanV 9s 1s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', left: '76%', top: 0, width: 1, height: '28%', background: 'linear-gradient(180deg,transparent,rgba(97,218,251,0.4),rgba(97,218,251,0.62),rgba(97,218,251,0.4),transparent)',  pointerEvents: 'none', animation: 'scanV 13s 4.5s ease-in-out infinite' }} />

      {/* Étoiles */}
      {STARS.map((s) => (
        <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', opacity: 0, pointerEvents: 'none', animation: `starBlink ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
      ))}

      {/* Étiquettes flottantes */}
      {LABELS.map((l, i) => (
        <div key={i} style={{ position: 'absolute', left: `${l.x}%`, top: `${l.y}%`, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.8, color: l.c, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap', animation: `labelFloat ${l.dur}s ${l.d}s ease-in-out infinite` }}>{l.t}</div>
      ))}

      {/* Particules */}
      {PARTICLES.map((p) => (
        <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.sz, height: p.sz, borderRadius: '50%', background: p.col, pointerEvents: 'none', filter: 'blur(0.4px)', animation: `ptDrift ${p.dur}s ${p.del}s ease-in-out infinite` }} />
      ))}

      {/* ══ CONTENEUR ══════════════════════════════════════════════════════════ */}
      <div style={{
        width: '100%', maxWidth: 460, position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(65px) scale(0.93)',
        transition: 'opacity 1s cubic-bezier(0.23,1,0.32,1),transform 1s cubic-bezier(0.23,1,0.32,1)',
      }}>

        {/* ══ CARD ═════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '1.5px', borderRadius: 22, background: 'linear-gradient(135deg,rgba(18,183,106,0.3) 0%,rgba(97,218,251,0.18) 50%,rgba(124,58,237,0.22) 100%)' }}>
          <div
            ref={cardRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{ background: 'rgba(3,8,20,0.96)', borderRadius: 21, backdropFilter: 'blur(55px)', overflow: 'hidden', position: 'relative', transform: tiltTr, transition: tiltTrs, transformStyle: 'preserve-3d' }}
          >
            {/* Lumière holo */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 55% 45% at ${50 + tilt.x * 42}% ${50 + tilt.y * 42}%,rgba(18,183,106,0.038) 0%,transparent 70%)`, transition: 'background 0.07s ease' }} />
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(18,183,106,0.7) 30%,rgba(97,218,251,0.45) 70%,transparent)', pointerEvents: 'none' }} />

            <div style={{ padding: '36px 32px 32px', position: 'relative' }}>
              {/* Titre card */}
              <div style={{ marginBottom: 28, animation: 'fadeUp 0.5s 0.04s ease both' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f6ff', letterSpacing: '-0.4px', marginBottom: 6 }}>Connexion</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#12b76a', boxShadow: '0 0 7px #12b76a', animation: 'blink 1.9s ease-in-out infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(18,183,106,0.55)', letterSpacing: 0.3 }}>Accès sécurisé</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}>

                {/* Email */}
                <div style={{ animation: 'fadeUp 0.5s 0.1s ease both' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(97,218,251,0.5)', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#61DAFB' : 'rgba(255,255,255,0.18)', transition: 'all 0.25s', filter: focused === 'email' ? 'drop-shadow(0 0 5px rgba(97,218,251,0.85))' : 'none', zIndex: 2, pointerEvents: 'none' }} />
                    <input
                      style={iStyle('email', '#61DAFB')}
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused('')}
                      autoComplete="email"
                      required
                    />
                    {focused === 'email' && <CornerAccents color="#61DAFB" />}
                  </div>
                </div>

                {/* Mot de passe */}
                <div style={{ animation: 'fadeUp 0.5s 0.18s ease both' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(18,183,106,0.5)', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8 }}>Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#12b76a' : 'rgba(255,255,255,0.18)', transition: 'all 0.25s', filter: focused === 'password' ? 'drop-shadow(0 0 5px rgba(18,183,106,0.85))' : 'none', zIndex: 2, pointerEvents: 'none' }} />
                    <input
                      style={{ ...iStyle('password', '#12b76a'), paddingRight: 46 }}
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused('')}
                      autoComplete="current-password"
                      required
                      minLength={6}
                    />
                    {focused === 'password' && <CornerAccents color="#12b76a" />}
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.18)', padding: 4, borderRadius: 6, transition: 'all 0.22s', display: 'flex', zIndex: 2 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#12b76a'; e.currentTarget.style.filter = 'drop-shadow(0 0 5px rgba(18,183,106,0.7))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; e.currentTarget.style.filter = 'none'; }}
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Bouton */}
                <div style={{ animation: 'fadeUp 0.5s 0.26s ease both', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    onMouseEnter={() => setBtnHover(true)}
                    onMouseLeave={() => setBtnHover(false)}
                    style={{
                      width: '100%', padding: '15px', borderRadius: 13,
                      fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
                      cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                      background: loading
                        ? 'rgba(255,255,255,0.04)'
                        : 'linear-gradient(135deg,#059669 0%,#12b76a 35%,#0ea5e9 75%,#61DAFB 100%)',
                      color: loading ? 'rgba(255,255,255,0.25)' : '#fff',
                      boxShadow: loading ? 'none' : btnHover
                        ? '0 12px 44px rgba(18,183,106,0.62),0 0 90px rgba(18,183,106,0.18)'
                        : '0 4px 28px rgba(18,183,106,0.38)',
                      transform: !loading && btnHover ? 'translateY(-2px) scale(1.012)' : 'translateY(0) scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {!loading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)', animation: 'shimmer 3s ease-in-out infinite' }} />
                    )}
                    {loading ? (
                      <>
                        <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.75)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        Authentification...
                      </>
                    ) : (
                      <>Accéder <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bas card */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(18,183,106,0.28),rgba(97,218,251,0.18),transparent)', pointerEvents: 'none' }} />
          </div>
        </div>

      </div>
    </div>
  );
}
