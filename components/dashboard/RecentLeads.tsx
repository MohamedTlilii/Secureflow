'use client';

import { memo } from 'react';
import { Building2, Home } from 'lucide-react';
import type { SolutionExpress } from '@/types';
import { STATUS_COLOR as STATUS_CLR, STATUS_LABEL as STATUS_LBL } from '@/types';
import s from '@/app/(dashboard)/dashboard.module.css';

const AV_COLORS = ['#3b6cf8', '#12b76a', '#f79009', '#be123c', '#a764f8', '#61DAFB'];

type RecentLead = Pick<SolutionExpress,
  'id' | 'entreprise' | 'prenom' | 'nom' | 'ville' | 'status' |
  'typeClient' | 'dateVente' | 'motifAnnulation' | 'createdAt'
>;

interface Props {
  isMobile: boolean;
  blur:     string | undefined;
  recent:   RecentLead[];
}

export const RecentLeads = memo(function RecentLeads({ isMobile, blur, recent }: Props) {
  return (
    <div className={s.section} style={{ background: 'linear-gradient(135deg,#12b76a40,#61DAFB25,#a78bfa15)', marginBottom: 0 }}>
      <div className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`} style={{ backdropFilter: blur, padding: isMobile ? 16 : 22 }}>
        <div className={s.sectionHeader}>
          <div className={s.sectionTitle}>Leads récents</div>
        </div>

        {recent.length ? (
          <div className={s.recentList}>
            {recent.map((f, i) => {
              const name    = f.entreprise || `${f.prenom || ''} ${f.nom || ''}`.trim() || 'Sans nom';
              const ini     = name[0].toUpperCase();
              const statClr = STATUS_CLR[f.status];
              const annulee = f.status === 'installation_annulee';
              const bgColor = AV_COLORS[i % AV_COLORS.length];

              return (
                <div
                  key={f.id}
                  className={`dash-row${annulee ? ' annulee' : ''} ${isMobile ? s.recentRowGapMobile : s.recentRowGap} ${s.recentRow}`}
                  style={{
                    borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    background:   annulee ? 'rgba(190,18,60,0.04)' : 'transparent',
                    borderRadius: annulee ? 8 : 0,
                  }}
                >
                  <div
                    className={s.recentAvatar}
                    style={{ background: `${bgColor}25`, border: `1.5px solid ${bgColor}40`, color: bgColor }}
                  >
                    {ini}
                  </div>

                  <div className={s.recentMeta}>
                    <div className={s.recentName} style={{ color: annulee ? '#be123c' : '#c0c0e0' }}>{name}</div>
                    <div className={s.recentSub}>
                      {f.ville || '—'}
                      {f.dateVente ? ` · ${new Date(f.dateVente).toLocaleDateString('fr-FR')}` : ''}
                    </div>
                    {annulee && f.motifAnnulation && (
                      <div className={s.recentCanceled}>✕ {f.motifAnnulation}</div>
                    )}
                  </div>

                  <span
                    className={s.badge}
                    style={{
                      background: f.typeClient === 'b2b' ? 'rgba(59,108,248,0.12)' : 'rgba(18,183,106,0.12)',
                      color:      f.typeClient === 'b2b' ? '#3b6cf8' : '#12b76a',
                    }}
                  >
                    {f.typeClient === 'b2b'
                      ? <><Building2 size={9} /> B2B</>
                      : <><Home size={9} /> B2C</>
                    }
                  </span>

                  <span
                    className={s.statusBadge}
                    style={{ background: `${statClr}15`, color: statClr }}
                  >
                    {STATUS_LBL[f.status]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={s.emptyState}>Aucun lead</div>
        )}
      </div>
    </div>
  );
});
