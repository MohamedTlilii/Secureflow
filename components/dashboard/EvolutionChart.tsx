'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import s from '@/app/(dashboard)/dashboard.module.css';

interface ChartFiltreItem { key: string; label: string; color: string }
interface ChartPoint { name: string; value: number; installes: number }

interface Props {
  isMobile:       boolean;
  blur:           string | undefined;
  anneeGlobal:    string;
  chartFiltre:    string;
  chartData:      ChartPoint[];
  activeBar:      ChartFiltreItem;
  filtres:        readonly ChartFiltreItem[];
  onFiltreChange: (key: string) => void;
}

export const EvolutionChart = memo(function EvolutionChart({
  isMobile, blur, anneeGlobal, chartFiltre, chartData, activeBar, filtres, onFiltreChange,
}: Props) {
  return (
    <div
      className={s.section}
      style={{ background: 'linear-gradient(135deg,#3b6cf840,#12b76a20)', animationDelay: '0.15s' }}
    >
      <div className={`${s.sectionInner} ${isMobile ? s.sectionInnerMobile : ''}`} style={{ backdropFilter: blur }}>
        <div className={s.sectionHeader}>
          <div className={s.sectionTitle}>
            Évolution {anneeGlobal === 'tout' ? 'par année' : `mensuelle ${anneeGlobal}`}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filtres.map(f => (
              <button
                key={f.key}
                onClick={() => onFiltreChange(f.key)}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', fontWeight: 700,
                  transition: 'all 0.2s',
                  border:      `1px solid ${chartFiltre === f.key ? f.color : '#fff'}`,
                  background:  chartFiltre === f.key ? `${f.color}25` : 'transparent',
                  color:       chartFiltre === f.key ? f.color : '#fff',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 120 : 160}>
          <BarChart data={chartData} barSize={isMobile ? 8 : 14} barGap={2} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#fff', fontSize: isMobile ? 8 : 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#fff', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(2,8,16,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(v: unknown, n: string) => [v as number, n]}
            />
            {chartFiltre === 'total' ? (
              <>
                <Bar dataKey="value"    name="Leads"    fill="#3b6cf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="installes" name="Installés" fill="#12b76a" radius={[3, 3, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="value" name={activeBar.label} fill={activeBar.color} radius={[3, 3, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>

        {chartFiltre === 'total' && (
          <div style={{ display: 'flex', gap: 14, marginTop: 6, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, color: '#3b6cf8', fontWeight: 700 }}>● Leads</span>
            <span style={{ fontSize: 11, color: '#12b76a', fontWeight: 700 }}>● Installés</span>
          </div>
        )}
      </div>
    </div>
  );
});
