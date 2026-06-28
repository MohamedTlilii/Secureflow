'use client';

import { memo } from 'react';
import { Users, Building2, Home } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import s from '@/app/(dashboard)/dashboard.module.css';

interface Props {
  isMobile: boolean;
  blur:     string | undefined;
  totalSE:  number;
  b2b:      number;
  b2c:      number;
}

export const TotalLeadsCard = memo(function TotalLeadsCard({ isMobile, blur, totalSE, b2b, b2c }: Props) {
  return (
    <div
      className={s.totalSection}
      style={{ background: 'linear-gradient(135deg,#06b6d470,#06b6d425)' }}
    >
      <div
        className={`${s.totalInner} ${isMobile ? s.totalPadMobile : s.totalPad}`}
        style={{ backdropFilter: blur }}
      >
        <div className={s.totalLeft}>
          <div className={s.totalIcon}>
            <Users size={24} color="#06b6d4" />
          </div>
          <div>
            <div className={s.totalLabel}>Total leads</div>
            <div className={isMobile ? s.totalValueMobile : s.totalValue}>
              <AnimatedNumber value={totalSE} decimals={0} color="#06b6d4" />
            </div>
          </div>
        </div>

        <div className={`${s.totalRight} ${isMobile ? s.totalRightGapMobile : s.totalRightGap}`}>
          {([
            { val: b2b, label: 'B2B', c: '#06b6d4', Icon: Building2 },
            { val: b2c, label: 'B2C', c: '#12b76a',  Icon: Home },
          ] as const).map(({ val, label, c, Icon }) => (
            <div key={label} className={s.totalTypeItem}>
              <div className={s.totalTypeIcon} style={{ background: `${c}20` }}>
                <Icon size={14} color={c} />
              </div>
              <div>
                <div className={`${isMobile ? s.totalTypeValMobile : s.totalTypeVal}`} style={{ color: c }}>{val}</div>
                <div className={s.totalTypeLbl} style={{ color: c }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
