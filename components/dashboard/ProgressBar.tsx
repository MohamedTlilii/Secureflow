'use client';

import { memo } from 'react';

const ProgressBar = memo(function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 3, background: color ?? '#12b76a', width: `${pct}%`, transition: 'width 0.8s ease' }} />
    </div>
  );
});

export default ProgressBar;
