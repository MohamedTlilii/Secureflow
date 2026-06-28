'use client';

import { memo, useCallback } from 'react';
import { Target } from 'lucide-react';
import s from '@/app/(dashboard)/dashboard.module.css';

interface CommerceItemProps {
  rank:       number;
  clé:        string;
  count:      number;
  label:      string;
  accentColor: string;
  bgActive:   string;
  bgRest:     string;
  rankBg:     string;
}

const CommerceItem = memo(function CommerceItem({
  rank, clé, count, label, accentColor, bgActive, bgRest, rankBg,
}: CommerceItemProps) {
  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background  = bgActive;
    e.currentTarget.style.transform   = 'translateY(-1px)';
  }, [bgActive]);
  const onLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background  = bgRest;
    e.currentTarget.style.transform   = '';
  }, [bgRest]);

  return (
    <div
      key={clé}
      className={s.commerceItem}
      style={{ background: bgRest, border: `1px solid ${accentColor}1f` }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className={s.commerceRank} style={{ background: `${accentColor}25`, color: accentColor }}>{rank}</div>
      <span className={s.commerceLabel}>{label}</span>
      <span className={s.commerceCount} style={{ color: accentColor }}>{count}</span>
    </div>
  );
});

interface Props {
  isMobile:    boolean;
  blur:        string | undefined;
  byCommerce:    [string, number][];
  byCommerceB2C: [string, number][];
  commerceLbl:   Record<string, string>;
}

export const CommerceSection = memo(function CommerceSection({
  isMobile, blur, byCommerce, byCommerceB2C, commerceLbl,
}: Props) {
  return (
    <>
      {byCommerce.length > 0 && (
        <div className={s.section} style={{ background: 'linear-gradient(135deg,#f7900940,#a78bfa20)' }}>
          <div className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`} style={{ backdropFilter: blur }}>
            <div className={s.sectionHeader}>
              <div className={s.sectionTitle} style={{ color: '#f79009' }}>B2B</div>
              <Target size={14} color="#f79009" />
            </div>
            <div className={`${s.commerceGrid} ${isMobile ? s.commerceGridMobile : s.commerceGridDesktop}`}>
              {byCommerce.map(([k, count], i) => (
                <CommerceItem
                  key={k} rank={i + 1} clé={k} count={count}
                  label={commerceLbl[k] ?? k}
                  accentColor="#f79009"
                  bgActive="rgba(247,144,9,0.12)"
                  bgRest="rgba(247,144,9,0.06)"
                  rankBg="rgba(247,144,9,0.15)"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {byCommerceB2C.length > 0 && (
        <div className={s.section} style={{ background: 'linear-gradient(135deg,#12b76a40,#61DAFB20)' }}>
          <div className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`} style={{ backdropFilter: blur }}>
            <div className={s.sectionHeader}>
              <div className={s.sectionTitle} style={{ color: '#12b76a' }}>B2C</div>
              <Target size={14} color="#12b76a" />
            </div>
            <div className={`${s.commerceGrid} ${isMobile ? s.commerceGridMobile : s.commerceGridDesktop}`}>
              {byCommerceB2C.map(([k, count], i) => (
                <CommerceItem
                  key={k} rank={i + 1} clé={k} count={count}
                  label={commerceLbl[k] ?? k}
                  accentColor="#12b76a"
                  bgActive="rgba(18,183,106,0.12)"
                  bgRest="rgba(18,183,106,0.06)"
                  rankBg="rgba(18,183,106,0.15)"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
});
