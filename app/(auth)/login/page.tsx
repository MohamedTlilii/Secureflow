'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import axios from 'axios';

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

const WORDS = ['Commissions', 'Carburant', 'Pipeline', 'Précis', 'Rentable', 'Automatisé', 'Sécurisé', 'Fiable'];

const DATA_POINTS: [number, number][] = [[22, 76], [36, 61], [50, 49], [64, 37]];

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
  const [wordIdx,  setWordIdx]  = useState(0);
  const [btnHover, setBtnHover] = useState(false);
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 });
  const [aurora,   setAurora]   = useState({ x: 50, y: 50 });

  const cardRef = useRef<HTMLDivElement>(null);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Rotation des mots
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 1600);
    return () => clearInterval(t);
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
      setTimeout(() => { window.location.replace('/'); }, 300);
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

        {/* ══ LOGO ═════════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', width: 92, margin: '0 auto' }}>

            {/* Anneaux pulsants */}
            {[
              { i: -24, d: '0s',   c: 'rgba(18,183,106,0.08)' },
              { i: -13, d: '0.9s', c: 'rgba(18,183,106,0.15)' },
              { i: -4,  d: '1.8s', c: 'rgba(18,183,106,0.26)' },
            ].map((ring, ri) => (
              <div key={ri} style={{ position: 'absolute', top: ring.i, bottom: ring.i, left: ring.i, right: ring.i, borderRadius: '22%', border: `1px solid ${ring.c}`, animation: `ringPulse 4s ${ring.d} ease-in-out infinite`, pointerEvents: 'none' }} />
            ))}

            {/* Boîte logo */}
            <div style={{ width: 92, height: 92, borderRadius: 24, background: 'linear-gradient(145deg,#041612 0%,#073322 55%,#041612 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'logoPulse 3.5s ease-in-out infinite', position: 'relative', zIndex: 1 }}>

              {/* SVG : Hexagone + Courbe commission + Goutte carburant */}
              <svg viewBox="0 0 100 100" width="62" height="62" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="lg1" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#12b76a" />
                    <stop offset="100%" stopColor="#61DAFB" />
                  </linearGradient>
                  <linearGradient id="lg2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#61DAFB" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="lg3" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#12b76a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#12b76a" stopOpacity="0.02" />
                  </linearGradient>
                  <filter id="gw" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Hexagone externe */}
                <polygon points="94,50 72,88 28,88 6,50 28,12 72,12"
                  fill="none" stroke="url(#lg1)" strokeWidth="1.6"
                  filter="url(#gw)"
                  style={{ animation: 'hexPulse 4s ease-in-out infinite' }} />

                {/* Hexagone interne (décor) */}
                <polygon points="80,50 65,76 35,76 20,50 35,24 65,24"
                  fill="none" stroke="rgba(18,183,106,0.13)" strokeWidth="0.8" />

                {/* Zone sous la courbe */}
                <polygon points="22,80 22,76 36,61 50,49 64,37 77,24 77,80"
                  fill="url(#lg3)" />

                {/* Courbe commission animée */}
                <polyline points="22,76 36,61 50,49 64,37 77,24"
                  fill="none" stroke="url(#lg1)" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  filter="url(#gw)" strokeDasharray="74"
                  style={{ animation: 'drawChart 5s 0.3s ease-in-out infinite' }} />

                {/* Points de données */}
                {DATA_POINTS.map(([x, y], idx) => (
                  <circle key={idx} cx={x} cy={y} r="3" fill="#12b76a"
                    filter="url(#gw)"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `dotPulse 3s ${idx * 0.45}s ease-in-out infinite` }} />
                ))}

                {/* Goutte carburant */}
                <path d="M77,14 C77,14 70,22 70,27 C70,30.9 73.1,34 77,34 C80.9,34 84,30.9 84,27 C84,22 77,14 77,14Z"
                  fill="url(#lg2)" filter="url(#gw)"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'fuelBounce 2.8s ease-in-out infinite' }} />

                {/* Reflet goutte */}
                <path d="M74,17.5 C74,17.5 72.5,22 72.5,25"
                  fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Reflet sol */}
            <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', width: 80, height: 14, background: 'radial-gradient(ellipse,rgba(18,183,106,0.38) 0%,transparent 70%)', filter: 'blur(8px)', pointerEvents: 'none' }} />
          </div>

          {/* Titre */}
          <div style={{ marginTop: 20, marginBottom: 5 }}>
            <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(135deg,#e8fff5 0%,#12b76a 25%,#61DAFB 65%,#a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SecureFlow
            </div>
          </div>

          {/* Mot animé */}
          <div style={{ height: 24, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ width: 28, height: 1.2, background: 'linear-gradient(90deg,transparent,rgba(18,183,106,0.38))', display: 'inline-block' }} />
            <span key={wordIdx} style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: 3.5, textTransform: 'uppercase', background: 'linear-gradient(135deg,#12b76a,#61DAFB,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'wordFlash 1.6s cubic-bezier(0.23,1,0.32,1) forwards', whiteSpace: 'nowrap' }}>
              {WORDS[wordIdx]}
            </span>
            <span style={{ width: 28, height: 1.2, background: 'linear-gradient(90deg,rgba(18,183,106,0.38),transparent)', display: 'inline-block' }} />
          </div>
        </div>

        {/* ══ CARD ═════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '1.5px', borderRadius: 27, background: 'linear-gradient(135deg,rgba(18,183,106,0.38) 0%,rgba(97,218,251,0.22) 40%,rgba(124,58,237,0.28) 80%,rgba(18,183,106,0.2) 100%)' }}>
          <div
            ref={cardRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{ background: 'rgba(3,8,18,0.97)', borderRadius: 26, backdropFilter: 'blur(55px)', overflow: 'hidden', position: 'relative', transform: tiltTr, transition: tiltTrs, transformStyle: 'preserve-3d' }}
          >
            {/* Lumière holo */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 55% 45% at ${50 + tilt.x * 42}% ${50 + tilt.y * 42}%,rgba(18,183,106,0.042) 0%,transparent 70%)`, transition: 'background 0.07s ease' }} />

            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(18,183,106,0.72) 25%,rgba(97,218,251,0.5) 75%,transparent)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.038)', background: 'linear-gradient(135deg,rgba(18,183,106,0.045) 0%,rgba(97,218,251,0.025) 60%,transparent 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 18.5, fontWeight: 900, color: '#f0f4ff', letterSpacing: '-0.3px' }}>Connexion</div>
                  <div style={{ fontSize: 11, color: 'rgba(18,183,106,0.55)', marginTop: 3, fontWeight: 500, letterSpacing: 0.4 }}>Commissions · Carburant · Pipeline</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 20, background: 'rgba(18,183,106,0.07)', border: '1px solid rgba(18,183,106,0.2)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#12b76a', boxShadow: '0 0 8px #12b76a', animation: 'blink 1.9s ease-in-out infinite' }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#12b76a', letterSpacing: 1, textTransform: 'uppercase' }}>Online</span>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div style={{ padding: '26px 28px 30px', position: 'relative' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', zIndex: 1 }}>

                {/* Email */}
                <div style={{ animation: 'fadeUp 0.52s 0.08s ease both' }}>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(97,218,251,0.4)', textTransform: 'uppercase', letterSpacing: 2.2, display: 'block', marginBottom: 9 }}>Adresse email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#61DAFB' : 'rgba(255,255,255,0.14)', transition: 'all 0.28s', filter: focused === 'email' ? 'drop-shadow(0 0 5px rgba(97,218,251,0.9))' : 'none', zIndex: 2, pointerEvents: 'none' }} />
                    <input
                      style={iStyle('email', '#61DAFB')}
                      type="email"
                      placeholder="contact@exemple.ca"
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
                <div style={{ animation: 'fadeUp 0.52s 0.17s ease both' }}>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(18,183,106,0.4)', textTransform: 'uppercase', letterSpacing: 2.2, display: 'block', marginBottom: 9 }}>Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#12b76a' : 'rgba(255,255,255,0.14)', transition: 'all 0.28s', filter: focused === 'password' ? 'drop-shadow(0 0 5px rgba(18,183,106,0.9))' : 'none', zIndex: 2, pointerEvents: 'none' }} />
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
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.16)', padding: 4, borderRadius: 6, transition: 'all 0.22s', display: 'flex', zIndex: 2 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#12b76a'; e.currentTarget.style.filter = 'drop-shadow(0 0 5px rgba(18,183,106,0.7))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.16)'; e.currentTarget.style.filter = 'none'; }}
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Bouton */}
                <div style={{ animation: 'fadeUp 0.52s 0.26s ease both', marginTop: 2 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    onMouseEnter={() => setBtnHover(true)}
                    onMouseLeave={() => setBtnHover(false)}
                    style={{
                      width: '100%', padding: '16.5px', borderRadius: 15,
                      fontSize: 14, fontWeight: 800, letterSpacing: 0.4,
                      cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                      background: loading
                        ? 'rgba(255,255,255,0.038)'
                        : 'linear-gradient(135deg,#059669 0%,#12b76a 30%,#0ea5e9 70%,#61DAFB 100%)',
                      color: loading ? 'rgba(255,255,255,0.22)' : '#fff',
                      boxShadow: loading ? 'none' : btnHover
                        ? '0 14px 50px rgba(18,183,106,0.68),0 0 100px rgba(18,183,106,0.2)'
                        : '0 5px 32px rgba(18,183,106,0.44),0 0 80px rgba(18,183,106,0.12)',
                      transform: !loading && btnHover ? 'translateY(-2px) scale(1.013)' : 'translateY(0) scale(1)',
                      transition: 'all 0.32s cubic-bezier(0.23,1,0.32,1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {!loading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)', animation: 'shimmer 3s ease-in-out infinite' }} />
                    )}
                    {!loading && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 15, background: 'linear-gradient(135deg,rgba(255,255,255,0.09) 0%,transparent 55%)', pointerEvents: 'none' }} />
                    )}
                    {loading ? (
                      <>
                        <div style={{ width: 17, height: 17, border: '2.5px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.75)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        Authentification...
                      </>
                    ) : (
                      <>Accéder au tableau de bord <ArrowRight size={15} /></>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bas card */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(18,183,106,0.32),rgba(97,218,251,0.2),transparent)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap', animation: 'fadeUp 0.52s 0.45s ease both' }}>
          {[
            { label: 'Commissions', c: 'rgba(18,183,106,0.68)',  b: 'rgba(18,183,106,0.14)',  bg: 'rgba(18,183,106,0.04)'  },
            { label: 'Carburant',   c: 'rgba(97,218,251,0.68)',  b: 'rgba(97,218,251,0.14)',  bg: 'rgba(97,218,251,0.04)'  },
            { label: 'Pipeline ×6', c: 'rgba(167,139,250,0.68)', b: 'rgba(167,139,250,0.14)', bg: 'rgba(167,139,250,0.04)' },
          ].map((badge, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4.5px 12px', borderRadius: 20, border: `1px solid ${badge.b}`, background: badge.bg }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: badge.c, boxShadow: `0 0 6px ${badge.c}` }} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: badge.c, letterSpacing: 0.8, textTransform: 'uppercase' }}>{badge.label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
