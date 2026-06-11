'use client';

import { Wallet } from 'lucide-react';
import type { SolutionExpress } from '@/types';

interface CommissionBadgeProps {
  fiche: SolutionExpress;
  onToggle: (fiche: SolutionExpress) => void;
}

export default function CommissionBadge({ fiche, onToggle }: CommissionBadgeProps) {
  const total = fiche.commissionTotale || 0;
  const payee = fiche.commissionPayee;

  if (!total && !fiche.commissionFixe && !fiche.commissionExtra) return null;

  const color  = payee ? '#12b76a' : '#f79009';
  const bgCss  = payee ? 'rgba(18,183,106,0.1)' : 'rgba(247,144,9,0.09)';
  const bdrCss = payee ? 'rgba(18,183,106,0.3)' : 'rgba(247,144,9,0.3)';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(fiche); }}
      title={payee ? 'Cliquer → Non payée' : 'Cliquer → Payée'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: bgCss, border: `1px solid ${bdrCss}`,
        borderRadius: 10, padding: '7px 13px', cursor: 'pointer',
        transition: 'all 0.2s ease', userSelect: 'none',
        animation: !payee ? 'commPulse 2.8s ease-in-out infinite' : 'none',
      }}
    >
      <Wallet size={13} color={color} />
      <span style={{ fontSize: 12, fontWeight: 800, color }}>{total.toFixed(2)} TND</span>
      <span style={{ fontSize: 10, fontWeight: 700, color, opacity: 0.85 }}>
        {payee ? '✓ Payée' : '⏳'}
      </span>
    </div>
  );
}
