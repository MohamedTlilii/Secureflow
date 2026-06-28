'use client';

import { memo, useCallback } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import ProgressBar from '@/components/dashboard/ProgressBar';
import s from '@/app/(dashboard)/dashboard.module.css';

interface CityRowProps { ville: string; count: number; rank: number; totalSE: number }

const CityRow = memo(function CityRow({ ville, count, rank, totalSE }: CityRowProps) {
  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateX(3px)'; }, []);
  const onLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = ''; }, []);
  return (
    <div className={s.cityRow} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className={s.cityRank}>{rank}</div>
      <span className={s.cityName}>{ville}</span>
      <span className={s.cityCount}>{count}</span>
      <ProgressBar value={count} max={totalSE} color="#61DAFB" />
    </div>
  );
});

interface Props {
  isMobile:    boolean;
  blur:        string | undefined;
  byCity:      [string, number][];
  byLeadType:  [string, number][];
  totalSE:     number;
  leadTypeLbl: Record<string, string>;
  leadTypeClr: Record<string, string>;
}

export const CitiesAndLeadTypes = memo(function CitiesAndLeadTypes({
  isMobile, blur, byCity, byLeadType, totalSE, leadTypeLbl, leadTypeClr,
}: Props) {
  return (
    <div className={`${isMobile ? s.twoColGridMobile : s.twoColGrid}`}>
      {/* Types de leads */}
      <div className={s.section} style={{ background: 'linear-gradient(135deg,#12b76a40,#f7900920)', marginBottom: 0 }}>
        <div
          className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`}
          style={{ backdropFilter: blur, height: '100%' }}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionTitle}>Types de leads</div>
            <Building2 size={14} color="#12b76a" />
          </div>
          {byLeadType.length ? (
            <div className={s.scrollList}>
              {byLeadType.map(([k, count]) => {
                const color = leadTypeClr[k] ?? '#8b8b9e';
                return (
                  <div key={k} className={s.leadTypeRow}>
                    <div className={s.leadTypeDot} style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                    <span className={s.leadTypeName}>{leadTypeLbl[k] ?? k}</span>
                    <span className={s.leadTypeCount} style={{ color }}>{count}</span>
                    <ProgressBar value={count} max={totalSE} color={color} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={s.emptyState}>Aucun type</div>
          )}
        </div>
      </div>

      {/* Villes */}
      <div className={s.section} style={{ background: 'linear-gradient(135deg,#61DAFB40,#a78bfa20)', marginBottom: 0 }}>
        <div
          className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`}
          style={{ backdropFilter: blur, height: '100%' }}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionTitle}>Villes</div>
            <MapPin size={14} color="#61DAFB" />
          </div>
          {byCity.length ? (
            <div className={s.scrollList}>
              {byCity.map(([ville, count], i) => (
                <CityRow key={ville} ville={ville} count={count} rank={i + 1} totalSE={totalSE} />
              ))}
            </div>
          ) : (
            <div className={s.emptyState}>Aucune ville</div>
          )}
        </div>
      </div>
    </div>
  );
});
