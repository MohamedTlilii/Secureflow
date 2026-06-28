'use client';

import { memo } from 'react';
import { Zap } from 'lucide-react';
import type { Service } from '@/types';
import ProgressBar from '@/components/dashboard/ProgressBar';
import s from '@/app/(dashboard)/dashboard.module.css';

interface Props {
  isMobile:    boolean;
  blur:        string | undefined;
  byProduit:   [string, number][];
  servicesMap: Record<string, Service>;
  totalSE:     number;
}

export const ProductsSection = memo(function ProductsSection({
  isMobile, blur, byProduit, servicesMap, totalSE,
}: Props) {
  return (
    <div className={s.section} style={{ background: 'linear-gradient(135deg,#f7900940,#12b76a20)' }}>
      <div className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`} style={{ backdropFilter: blur }}>
        <div className={s.sectionHeader}>
          <div className={s.sectionTitle}>Produits</div>
          <Zap size={14} color="#f79009" />
        </div>
        {byProduit.length ? (
          <div className={s.prodList}>
            {byProduit.map(([id, count]) => {
              const svc   = servicesMap[id];
              const label = svc?.label ?? id.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
              const color = svc?.color ?? '#8b8b9e';
              return (
                <div key={id} className={s.prodRow}>
                  <div className={s.prodIcon} style={{ background: `${color}18` }}>
                    <Zap size={13} color={color} />
                  </div>
                  <div className={s.prodMeta}>
                    <div className={s.prodMetaRow}>
                      <span className={s.prodName}>{label}</span>
                      <span className={s.prodCount} style={{ color }}>{count}</span>
                    </div>
                    <ProgressBar value={count} max={totalSE} color={color} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={s.emptyState}>Aucun produit</div>
        )}
      </div>
    </div>
  );
});
