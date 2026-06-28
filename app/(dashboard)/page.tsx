'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AlertCircle, Target, Star, Phone, Clock, CheckCircle, XCircle,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import { getCachedSettings } from '@/lib/settings-cache';
import useIsMobile from '@/hooks/useIsMobile';
import CosmosBackground from '@/components/CosmosBackground';
import AnimatedNumber from '@/components/AnimatedNumber';
import ScoreRing from '@/components/dashboard/ScoreRing';
import { TotalLeadsCard }      from '@/components/dashboard/TotalLeadsCard';
import { StatusCards }         from '@/components/dashboard/StatusCards';
import { EvolutionChart }      from '@/components/dashboard/EvolutionChart';
import { ProductsSection }     from '@/components/dashboard/ProductsSection';
import { CitiesAndLeadTypes }  from '@/components/dashboard/CitiesAndLeadTypes';
import { CommerceSection }     from '@/components/dashboard/CommerceSection';
import { RecentLeads }         from '@/components/dashboard/RecentLeads';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { DEFAULT_SETTINGS, MOIS_FULL } from '@/types';
import s from './dashboard.module.css';

/* ── Palettes module-level (références stables) ────────────────────────────── */
const LEAD_PALETTE     = ['#12b76a', '#0077b5', '#f79009', '#a764f8', '#f04438', '#61DAFB', '#8b8b9e'];
const DASH_PART_COLORS = ['#12b76a', '#3b6cf8', '#61DAFB', '#a78bfa', '#34d399'];

const CHART_FILTRES = [
  { key: 'total'    as const, label: 'Total',    color: '#3b6cf8' },
  { key: 'installe' as const, label: 'Installé', color: '#22c55e' },
  { key: 'encours'  as const, label: 'En cours', color: '#f97316' },
  { key: 'annule'   as const, label: 'Annulé',   color: '#be123c' },
  { key: 'paye'     as const, label: 'Payé',     color: '#06b6d4' },
] as const;

const EMPTY_COUNTS: Record<StatusFiche, number> = {
  new: 0, contacted: 0, proposal: 0,
  installation_en_cours: 0, installe: 0, installation_annulee: 0,
};

const FMT_DATE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});
const todayStr    = () => FMT_DATE.format(new Date());
const isAbortErr  = (e: unknown) => (e as { code?: string })?.code === 'ERR_CANCELED';

/* ── Type aligné sur la réponse API ────────────────────────────────────────── */
interface DashStats {
  totalSE: number; b2b: number; b2c: number; won: number; convRate: number;
  counts: Record<StatusFiche, number>; annees: number[];
  byCity: [string, number][]; byLeadType: [string, number][];
  byCommerce: [string, number][]; byCommerceB2C: [string, number][];
  byProduit: [string, number][];
  recent: Pick<SolutionExpress,
    'id' | 'entreprise' | 'prenom' | 'nom' | 'ville' | 'status' |
    'typeClient' | 'dateVente' | 'motifAnnulation' | 'createdAt'
  >[];
  evolutionData: { name: string; total: number; installe: number; encours: number; annule: number; paye: number }[];
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE — coordinateur de données
════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const isMobile = useIsMobile();

  const [stats,       setStats]       = useState<DashStats | null>(null);
  const [settings,    setSettings]    = useState<Settings>(DEFAULT_SETTINGS);
  const [error,       setError]       = useState<string | null>(null);
  const [anneeGlobal, setAnneeGlobal] = useState<string>(String(new Date().getFullYear()));
  const [dashMois,    setDashMois]    = useState<string>('tout');
  const [chartFiltre, setChartFiltre] = useState<typeof CHART_FILTRES[number]['key']>('total');
  const [loading,     setLoading]     = useState(true);
  const [todayLabel,  setTodayLabel]  = useState(todayStr);

  const ctrlRef    = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  /* ── Settings : chargement initial uniquement ── */
  useEffect(() => {
    getCachedSettings().then(s => {
      if (!mountedRef.current) return;
      if (s) setSettings(s);
      else toast('Labels non disponibles, paramètres par défaut utilisés', { duration: 3500 });
    });
  }, []);

  /* ── fetchStats ── */
  const fetchStats = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    let canceled = false;
    try {
      const { data } = await api.get<DashStats>('/api/dashboard/stats', {
        params: { annee: anneeGlobal, mois: dashMois },
        signal,
      });
      setStats(data);
    } catch (e) {
      if (isAbortErr(e)) { canceled = true; return; }
      setError(apiErrMsg(e, 'Impossible de charger les données'));
    } finally {
      if (!canceled) setLoading(false);
    }
  }, [anneeGlobal, dashMois]);

  const handleRetry = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = new AbortController();
    fetchStats(ctrlRef.current.signal);
  }, [fetchStats]);

  /* ── Listener unique : stats + settings + date au retour sur l'onglet ── */
  useEffect(() => {
    setStats(null);
    const load = () => {
      ctrlRef.current?.abort();
      ctrlRef.current = new AbortController();
      fetchStats(ctrlRef.current.signal);
    };
    load();
    const onVis = () => {
      if (document.hidden) return;
      setTodayLabel(todayStr());
      getCachedSettings().then(s => { if (mountedRef.current && s) setSettings(s); });
      load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { ctrlRef.current?.abort(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchStats]);

  /* ── Lookups O(1) ── */
  const leadTypeLbl = useMemo(() =>
    Object.fromEntries(settings.typeLead.map(t => [t.key, t.label])),
    [settings.typeLead]);

  const leadTypeClr = useMemo(() => {
    const m: Record<string, string> = {};
    settings.typeLead.forEach((t, i) => { m[t.key] = LEAD_PALETTE[i % LEAD_PALETTE.length]; });
    return m;
  }, [settings.typeLead]);

  const commerceLbl = useMemo(() =>
    Object.fromEntries(settings.typeCommerce.map(t => [t.key, t.label])),
    [settings.typeCommerce]);

  const servicesMap = useMemo(() =>
    Object.fromEntries(settings.services.map(sv => [sv.id, sv])),
    [settings.services]);

  /* ── Raccourcis ── */
  const annees        = stats?.annees        ?? [];
  const totalSE       = stats?.totalSE       ?? 0;
  const b2b           = stats?.b2b           ?? 0;
  const b2c           = stats?.b2c           ?? 0;
  const won           = stats?.won           ?? 0;
  const convRate      = stats?.convRate      ?? 0;
  const counts        = stats?.counts        ?? EMPTY_COUNTS;
  const byCity        = stats?.byCity        ?? [];
  const byLeadType    = stats?.byLeadType    ?? [];
  const byCommerce    = stats?.byCommerce    ?? [];
  const byCommerceB2C = stats?.byCommerceB2C ?? [];
  const byProduit     = stats?.byProduit     ?? [];
  const recent        = stats?.recent        ?? [];
  const evolutionData = stats?.evolutionData ?? [];

  const statusCards = useMemo(() => ([
    { label: 'Nouveau',               value: counts.new,                  sub: 'nouvelles fiches',       Icon: Star,        s: 'new'                   as StatusFiche },
    { label: 'Contacté',              value: counts.contacted,             sub: 'clients contactés',      Icon: Phone,       s: 'contacted'             as StatusFiche },
    { label: 'Soumissions',           value: counts.proposal,              sub: 'soumissions envoyées',   Icon: Clock,       s: 'proposal'              as StatusFiche },
    { label: 'Installation en cours', value: counts.installation_en_cours, sub: 'installations en cours', Icon: AlertCircle, s: 'installation_en_cours' as StatusFiche },
    { label: 'Installés',             value: won,                          sub: 'installations réussies', Icon: CheckCircle, s: 'installe'              as StatusFiche },
    { label: 'Annulées',              value: counts.installation_annulee,  sub: 'installations annulées', Icon: XCircle,     s: 'installation_annulee'  as StatusFiche },
  ] as { label: string; value: number; sub: string; Icon: LucideIcon; s: StatusFiche }[]),
  [counts, won]);

  const activeChartBar = useMemo(
    () => CHART_FILTRES.find(x => x.key === chartFiltre) ?? CHART_FILTRES[0],
    [chartFiltre],
  );

  const chartData = useMemo(() => evolutionData.map(d => ({
    name:     d.name,
    value:    chartFiltre === 'total'    ? d.total
            : chartFiltre === 'installe' ? d.installe
            : chartFiltre === 'encours'  ? d.encours
            : chartFiltre === 'annule'   ? d.annule
            : d.paye,
    installes: chartFiltre === 'total' ? d.installe : 0,
  })), [evolutionData, chartFiltre]);

  const blur40 = isMobile ? undefined : 'blur(40px)';
  const blur20 = isMobile ? undefined : 'blur(20px)';

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className={s.root}>
      <div className={s.bgGradient} />
      <CosmosBackground particleColors={DASH_PART_COLORS} />

      <div className={`${s.content} ${isMobile ? s.contentPadMobile : s.contentPad}`}>

        {/* ════ HEADER ════════════════════════════════════════════════ */}
        <div
          className={s.headerSection}
          style={{ background: 'linear-gradient(135deg,#12b76a60,#61DAFB30,#a78bfa25)' }}
        >
          <div
            className={`${s.headerInner} ${isMobile ? s.headerPadMobile : s.headerPad}`}
            style={{ backdropFilter: blur40 }}
          >
            {/* Orbes décoratifs */}
            <div className={s.headerOrb} style={{ top: -80, left: -60,  width: 320, height: 320, background: 'radial-gradient(circle,rgba(18,183,106,0.18) 0%,transparent 70%)' }} />
            <div className={s.headerOrb} style={{ top: -20, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(97,218,251,0.12) 0%,transparent 70%)' }} />
            <div className={s.headerOrb} style={{ bottom: -60, right: 100, width: 200, height: 200, background: 'radial-gradient(circle,rgba(167,139,250,0.10) 0%,transparent 70%)' }} />

            <div className={s.headerContent}>
              {/* Titre + filtres */}
              <div className={`${s.headerTop} ${isMobile ? s.headerTopMobile : ''}`}>
                <div className={s.headerTitleRow}>
                  <div className={s.headerLogo}><Target size={26} color="#030a16" /></div>
                  <div>
                    <h1 className={`${s.headerTitle} ${isMobile ? s.headerTitleMobile : ''}`}>Dashboard</h1>
                    <p className={s.headerSubtitle}>
                      {totalSE} lead{totalSE !== 1 ? 's' : ''} · {anneeGlobal === 'tout' ? 'Toutes les années' : anneeGlobal}
                    </p>
                  </div>
                </div>

                <div className={s.headerFilters}>
                  {!isMobile && <div className={s.headerDate}>{todayLabel}</div>}
                  <select
                    className={s.headerSelect}
                    value={anneeGlobal}
                    onChange={e => { setAnneeGlobal(e.target.value); setDashMois('tout'); }}
                  >
                    <option value="tout">Toutes les années</option>
                    {annees.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  {anneeGlobal !== 'tout' && (
                    <select
                      className={s.headerSelect}
                      value={dashMois}
                      onChange={e => setDashMois(e.target.value)}
                    >
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Taux d'installation */}
              <div className={`${s.rateRow} ${isMobile ? s.rateRowMobile : ''}`}>
                <div style={{ flex: 1 }}>
                  <div className={`${s.rateLabel} ${isMobile ? s.rateLabelMobile : ''}`}>
                    Taux d&apos;installation{' '}
                    <span><AnimatedNumber value={convRate} decimals={0} suffix="%" color="#12b76a" /></span>
                  </div>
                  <div className={s.rateDesc}>
                    <span style={{ color: '#12b76a', fontWeight: 700 }}>{won}</span>
                    {' '}installé{won !== 1 ? 's' : ''} sur{' '}
                    <span style={{ color: '#12b76a', fontWeight: 700 }}>{totalSE}</span>
                    {' '}lead{totalSE !== 1 ? 's' : ''}
                  </div>
                  <div className={s.rateBarWrap}>
                    <div className={s.rateBarFill} style={{ width: `${convRate}%` }}>
                      {convRate > 8 && <span className={s.rateBarPct}>{convRate}%</span>}
                    </div>
                    <span className={s.rateBarMax}>100%</span>
                  </div>
                </div>

                {!isMobile && (
                  <div className={s.scoreRings}>
                    <ScoreRing value={counts.proposal}              max={totalSE || 1} color="#a764f8" label="Soumission" />
                    <ScoreRing value={counts.installation_en_cours} max={totalSE || 1} color="#f97316" label="En cours" />
                    <ScoreRing value={won}                          max={totalSE || 1} color="#22c55e" label="Installé" />
                    <ScoreRing value={counts.installation_annulee}  max={totalSE || 1} color="#be123c" label="Annulée" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════ LOADING / ERROR / CONTENT ════════════════════════════ */}
        {loading ? (
          <div className={s.loadingWrap}><div className={s.spinner} /></div>
        ) : !stats && error ? (
          <div className={s.errorWrap}>
            <AlertCircle size={36} color="#be123c" />
            <p className={s.errorText}>{error}</p>
            <button className={s.errorBtn} onClick={handleRetry}>Réessayer</button>
          </div>
        ) : (
          <>
            {/* Bandeau erreur non-bloquant */}
            {error && (
              <div className={s.errorBanner}>
                <AlertCircle size={14} color="#be123c" />
                <span className={s.errorBannerText}>{error}</span>
                <button className={s.errorBannerBtn} onClick={handleRetry}>Réessayer</button>
              </div>
            )}

            <EvolutionChart
              isMobile={isMobile} blur={blur20}
              anneeGlobal={anneeGlobal}
              chartFiltre={chartFiltre}
              chartData={chartData}
              activeBar={activeChartBar}
              filtres={CHART_FILTRES}
              onFiltreChange={k => setChartFiltre(k as typeof CHART_FILTRES[number]['key'])}
            />

            <TotalLeadsCard isMobile={isMobile} blur={blur20} totalSE={totalSE} b2b={b2b} b2c={b2c} />

            <StatusCards cards={statusCards} isMobile={isMobile} blur={blur20} />

            <ProductsSection
              isMobile={isMobile} blur={blur20}
              byProduit={byProduit} servicesMap={servicesMap} totalSE={totalSE}
            />

            <CitiesAndLeadTypes
              isMobile={isMobile} blur={blur20}
              byCity={byCity} byLeadType={byLeadType}
              totalSE={totalSE}
              leadTypeLbl={leadTypeLbl} leadTypeClr={leadTypeClr}
            />

            <CommerceSection
              isMobile={isMobile} blur={blur20}
              byCommerce={byCommerce} byCommerceB2C={byCommerceB2C}
              commerceLbl={commerceLbl}
            />

            <RecentLeads isMobile={isMobile} blur={blur20} recent={recent} />
          </>
        )}
      </div>
    </div>
  );
}
