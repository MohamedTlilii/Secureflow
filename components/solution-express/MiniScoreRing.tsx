'use client';

import { useEffect, useState } from 'react';

interface MiniScoreRingProps {
  score: number;
  size?: number;
}

export default function MiniScoreRing({ score, size = 36 }: MiniScoreRingProps) {
  const [animated, setAnimated] = useState(0);
  const r     = size / 2 - 3.5;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(10, Math.max(0, score)) / 10;
  const color = score >= 8 ? '#ef4444' : score >= 5 ? '#f97316' : score >= 3 ? '#f59e0b' : '#12b76a';

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={3.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={3.5}
          strokeDasharray={`${circ * animated} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <span style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        fontSize: Math.max(9, size * 0.3), fontWeight: 800, color, lineHeight: 1,
      }}>
        {score}
      </span>
    </div>
  );
}
