import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const YEAR_COLORS = ['#12b76a','#3b6cf8','#f79009','#a764f8','#f04438','#61DAFB','#f97316'];

export async function GET(req: NextRequest) {
  const sp         = new URL(req.url).searchParams;
  const anneeParam = sp.get('annee')    ?? 'tout';
  const filtre     = sp.get('filtre')   ?? 'tout';
  const calAnnee   = parseInt(sp.get('calAnnee') ?? String(new Date().getFullYear()), 10);
  const calMois    = parseInt(sp.get('calMois')  ?? String(new Date().getMonth()), 10);

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const all = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const objectifAnnuel = (settings?.objectifAnnuel ?? {}) as Record<string, number>;

    const getDate = (f: (typeof all)[0]) => new Date(f.dateVente ?? f.createdAt);

    const cur    = new Date().getFullYear();
    const withComm = all.filter(f => (f.commissionTotale || 0) > 0 || (f.commissionFixe || 0) > 0);
    const annees   = [...new Set([cur, ...withComm.map(f => getDate(f).getFullYear())])].sort((a, b) => b - a);

    const byAnnee = anneeParam === 'tout'
      ? withComm
      : withComm.filter(c => String(getDate(c).getFullYear()) === anneeParam);

    const filtered = byAnnee.filter(c => {
      if (filtre === 'payee')     return c.commissionPayee;
      if (filtre === 'non_payee') return !c.commissionPayee && c.status !== 'installation_annulee';
      if (filtre === 'annulee')   return c.status === 'installation_annulee';
      return true;
    });

    // Historique du mois courant
    const filteredHistorique = filtered.filter(c => {
      const d = getDate(c);
      return d.getFullYear() === calAnnee && d.getMonth() === calMois;
    });

    // Stats (pour année = toutes les années ; pour année sélectionnée = mois courant)
    const baseStats       = anneeParam === 'tout' ? filtered : filteredHistorique;
    const activesForStats = baseStats.filter(c => c.status !== 'installation_annulee');
    const annuleeForStats = baseStats.filter(c => c.status === 'installation_annulee');
    const actives = filtre === 'annulee' ? annuleeForStats : activesForStats;

    const totalGagne  = filtre === 'annulee' ? 0 : activesForStats.reduce((s, c) => s + (c.commissionTotale || 0), 0);
    const totalAnnule = annuleeForStats.reduce((s, c) => s + (c.commissionTotale || 0), 0);
    const totalPaye   = filtre === 'annulee' ? 0 : activesForStats.filter(c => c.commissionPayee).reduce((s, c) => s + (c.commissionTotale || 0), 0);
    const enAttente   = filtre === 'annulee' ? 0 : Math.max(0, totalGagne - totalPaye);
    const vals        = actives.map(c => c.commissionTotale || 0).filter(v => v > 0);
    const maximum     = vals.length ? Math.max(...vals) : 0;
    const minimum     = vals.length ? Math.min(...vals) : 0;
    const pctPaye     = totalGagne > 0 ? Math.round((totalPaye / totalGagne) * 100) : 0;

    const objectif = anneeParam !== 'tout' ? (objectifAnnuel[anneeParam] || 0) : 0;
    const objPct   = objectif > 0 ? Math.min(Math.round((totalGagne / objectif) * 100), 100) : 0;

    const nActives  = activesForStats.length;
    const nPayees   = activesForStats.filter(c => c.commissionPayee).length;
    const nAttente  = activesForStats.filter(c => !c.commissionPayee).length;
    const nAnnulees = annuleeForStats.length;

    // Chart data
    let chartData;
    if (anneeParam === 'tout') {
      chartData = annees.map((yr, i) => {
        const yrF       = filtered.filter(c => String(getDate(c).getFullYear()) === String(yr));
        const activeYrF = filtre === 'annulee' ? yrF : yrF.filter(c => c.status !== 'installation_annulee');
        const barColor  = filtre === 'payee' ? '#3b6cf8' : filtre === 'non_payee' ? '#f79009' : filtre === 'annulee' ? '#be123c' : YEAR_COLORS[i % YEAR_COLORS.length];
        return {
          name: String(yr),
          total: activeYrF.reduce((s, c) => s + (c.commissionTotale || 0), 0),
          count: yrF.length,
          cPayee:   yrF.filter(c => c.commissionPayee && c.status !== 'installation_annulee').length,
          cAttente: yrF.filter(c => !c.commissionPayee && c.status !== 'installation_annulee').length,
          cAnnulee: yrF.filter(c => c.status === 'installation_annulee').length,
          color: barColor,
        };
      });
    } else {
      chartData = [...filteredHistorique]
        .sort((a, b) => getDate(a).getTime() - getDate(b).getTime())
        .map(c => {
          const d       = getDate(c);
          const annulee = c.status === 'installation_annulee';
          return {
            name:    `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`,
            total:   c.commissionTotale || 0,
            color:   annulee ? '#be123c' : c.commissionPayee ? '#3b6cf8' : '#f79009',
            annulee,
            fullNom: c.entreprise || `${c.prenom || ''} ${c.nom || ''}`.trim() || '?',
            motif:   c.motifAnnulation || '',
            payee:   c.commissionPayee,
          };
        });
    }

    // Calendar data (all days in the year that have commissions)
    const calendarData: Record<string, { total: number; payee: number; attente: number; annulee: number }> = {};
    filtered.forEach(c => {
      const d   = getDate(c);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!calendarData[key]) calendarData[key] = { total: 0, payee: 0, attente: 0, annulee: 0 };
      if (c.status !== 'installation_annulee') calendarData[key].total += c.commissionTotale || 0;
      if (c.status === 'installation_annulee') calendarData[key].annulee += 1;
      if (c.commissionPayee)                        calendarData[key].payee   += c.commissionTotale || 0;
      else if (c.status !== 'installation_annulee') calendarData[key].attente += c.commissionTotale || 0;
    });

    const totalMois = Object.entries(calendarData)
      .filter(([k]) => k.startsWith(`${calAnnee}-${String(calMois + 1).padStart(2, '0')}`))
      .reduce((s, [, v]) => s + v.total, 0);

    return NextResponse.json({
      totalGagne, totalPaye, enAttente, totalAnnule,
      maximum, minimum, pctPaye,
      objectif, objPct,
      nActives, nPayees, nAttente, nAnnulees,
      annees, chartData, calendarData, historique: filteredHistorique, totalMois,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
