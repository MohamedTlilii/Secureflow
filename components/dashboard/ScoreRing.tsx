'use client';

import { memo, useState, useEffect } from 'react';

const RING_R    = 36;
const RING_CIRC = 2 * Math.PI * RING_R;

interface Props { value: number; max: number; color: string; label: string }

const ScoreRing = memo(function ScoreRing({ value, max, color, label }: Props) {
  const [animated, setAnimated] = useState(0);
  const pct = max > 0 ? value / max : 0;
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 200); return () => clearTimeout(t); }, [pct]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={45} cy={45} r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={7} />
          <circle cx={45} cy={45} r={RING_R} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${RING_CIRC * animated} ${RING_CIRC}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
});

export default ScoreRing;
