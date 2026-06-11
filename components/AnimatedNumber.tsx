'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
  color?: string;
}

export default function AnimatedNumber({ value, decimals = 0, suffix = '', color }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    const end   = typeof value === 'number' && isFinite(value) ? value : 0;
    prev.current = end;
    if (start === end) return;

    const duration  = 900;
    const startTime = performance.now();
    let rafId: number;

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * ease);
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span style={{ color }}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}
