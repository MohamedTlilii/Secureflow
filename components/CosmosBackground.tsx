'use client';

import { useState, useEffect, useRef } from 'react';

interface Star { x: number; y: number; s: number; o: number; d: number }
interface Particle { x: number; y: number; s: number; d: number; delay: number; color: string }

const DEFAULT_COLORS = ['#12b76a', '#3b6cf8', '#61DAFB', '#a78bfa', '#34d399'];

export default function CosmosBackground({ particleColors = DEFAULT_COLORS }: { particleColors?: string[] }) {
  const [mounted, setMounted] = useState(false);
  const starsRef = useRef<Star[]>([]);
  const partsRef = useRef<Particle[]>([]);

  useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 2 + 0.4, o: Math.random() * 0.5 + 0.08, d: Math.random() * 5 + 2,
    }));
    partsRef.current = Array.from({ length: 18 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100 + 100,
      s: Math.random() * 5 + 2, d: Math.random() * 18 + 10, delay: Math.random() * 8,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }));
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {mounted && starsRef.current.map((s, i) => (
        <div key={i} style={{ position: 'fixed', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: '#fff', opacity: s.o, pointerEvents: 'none', zIndex: 0, animation: `cosmos-twinkle ${s.d}s ease-in-out infinite`, animationDelay: `${i * 0.08}s` }} />
      ))}
      {mounted && partsRef.current.map((p, i) => (
        <div key={i} style={{ position: 'fixed', left: `${p.x}%`, bottom: `-${p.y}px`, width: p.s, height: p.s, borderRadius: '50%', background: p.color, opacity: 0.4, pointerEvents: 'none', zIndex: 0, animation: `cosmos-rise ${p.d}s linear infinite`, animationDelay: `${p.delay}s` }} />
      ))}
    </>
  );
}
