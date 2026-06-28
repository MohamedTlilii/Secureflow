'use client';

import { memo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatusFiche } from '@/types';
import { STATUS_COLOR as STATUS_CLR } from '@/types';
import AnimatedNumber from '@/components/AnimatedNumber';
import s from '@/app/(dashboard)/dashboard.module.css';

interface CardDef {
  label: string;
  value: number;
  sub:   string;
  Icon:  LucideIcon;
  s:     StatusFiche;
}

interface Props {
  cards:    CardDef[];
  isMobile: boolean;
  blur:     string | undefined;
}

const StatusCard = memo(function StatusCard({ card, isMobile, blur }: { card: CardDef; isMobile: boolean; blur: string | undefined }) {
  const color = STATUS_CLR[card.s];

  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform  = 'translateY(-3px)';
    e.currentTarget.style.boxShadow  = `0 12px 32px ${color}25`;
  }, [color]);
  const onLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform  = '';
    e.currentTarget.style.boxShadow  = '';
  }, []);

  return (
    <div
      className={s.statusCard}
      style={{ background: `linear-gradient(135deg,${color}65,${color}22)` }}
    >
      <div
        className={`${s.statusCardInner} ${isMobile ? s.statusCardPadMobile : s.statusCardPad}`}
        style={{ backdropFilter: blur }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className={s.statusCardBody}>
          <div>
            <div className={s.statusCardLbl} style={{ color }}>{card.label}</div>
            <div className={isMobile ? s.statusCardValMobile : s.statusCardVal} style={{ color }}>
              <AnimatedNumber value={card.value} decimals={0} color={color} />
            </div>
            <div className={s.statusCardSub} style={{ color }}>{card.sub}</div>
          </div>
          <div
            className={s.statusCardIcon}
            style={{ background: `${color}20`, boxShadow: `0 0 18px ${color}30` }}
          >
            <card.Icon size={18} color={color} />
          </div>
        </div>
      </div>
    </div>
  );
});

export const StatusCards = memo(function StatusCards({ cards, isMobile, blur }: Props) {
  return (
    <div className={`${s.statusGrid} ${isMobile ? s.statusGridMobile : s.statusGridDesktop}`}>
      {cards.map((card, i) => (
        <div
          key={card.s}
          style={{ animation: `fadeSlideUp 0.4s ${0.05 + i * 0.06}s ease both` }}
        >
          <StatusCard card={card} isMobile={isMobile} blur={blur} />
        </div>
      ))}
    </div>
  );
});
