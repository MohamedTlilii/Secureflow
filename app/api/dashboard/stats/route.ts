import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUTS = ['new','contacted','proposal','installation_en_cours','installe','installation_annulee'] as const;
const MOIS_COURT    = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export async function GET(req: NextRequest) {
  const sp           = new URL(req.url).searchParams;
  const anneeParam   = sp.get('annee')       ?? 'tout';
  const moisParam    = sp.get('mois')        ?? 'tout';
  const chartFiltre  = sp.get('chartFiltre') ?? 'total';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const all = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const getDate = (f: (typeof all)[0]) => new Date(f.dateVente ?? f.createdAt);

    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...all.map(f => getDate(f).getFullYear())])].sort((a, b) => b - a);

    let fiches = anneeParam === 'tout'
      ? all
      : all.filter(f => getDate(f).getFullYear() === Number(anneeParam));
    if (anneeParam !== 'tout' && moisParam !== 'tout') {
      fiches = fiches.filter(f => getDate(f).getMonth() === Number(moisParam));
    }

    const counts = Object.fromEntries(
      VALID_STATUTS.map(s => [s, fiches.filter(f => f.status === s).length])
    );
    const totalSE  = fiches.length;
    const b2b      = fiches.filter(f => f.typeClient === 'b2b').length;
    const b2c      = fiches.filter(f => f.typeClient === 'b2c').length;
    const won      = (counts.installe as number) || 0;
    const convRate = totalSE > 0 ? Math.round((won / totalSE) * 100) : 0;

    const cityMap: Record<string, number> = {};
    fiches.forEach(f => { if (f.ville) cityMap[f.ville] = (cityMap[f.ville] || 0) + 1; });
    const byCity = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);

    const ltMap: Record<string, number> = {};
    fiches.forEach(f => { if (f.leadType) ltMap[f.leadType] = (ltMap[f.leadType] || 0) + 1; });
    const byLeadType = Object.entries(ltMap).sort((a, b) => b[1] - a[1]);

    const b2bMap: Record<string, number> = {};
    fiches.filter(f => f.typeClient === 'b2b' && f.typeCommerce && f.typeCommerce !== 'autre')
      .forEach(f => { b2bMap[f.typeCommerce] = (b2bMap[f.typeCommerce] || 0) + 1; });
    const byCommerce = Object.entries(b2bMap).sort((a, b) => b[1] - a[1]);

    const b2cMap: Record<string, number> = {};
    fiches.filter(f => f.typeClient === 'b2c' && f.typeCommerce && f.typeCommerce !== 'autre')
      .forEach(f => { b2cMap[f.typeCommerce] = (b2cMap[f.typeCommerce] || 0) + 1; });
    const byCommerceB2C = Object.entries(b2cMap).sort((a, b) => b[1] - a[1]);

    const prodMap: Record<string, number> = {};
    fiches.forEach(f => {
      (f.produits as string[]).forEach(p => { prodMap[p] = (prodMap[p] || 0) + 1; });
    });
    const byProduit = Object.entries(prodMap).sort((a, b) => b[1] - a[1]);

    const recent = [...fiches]
      .sort((a, b) => getDate(b).getTime() - getDate(a).getTime())
      .slice(0, 6);

    const fn = (f: (typeof all)[0]) => {
      if (chartFiltre === 'installe') return f.status === 'installe';
      if (chartFiltre === 'encours')  return f.status === 'installation_en_cours';
      if (chartFiltre === 'annule')   return f.status === 'installation_annulee';
      if (chartFiltre === 'paye')     return !!f.commissionPayee && f.status !== 'installation_annulee';
      return true;
    };

    let evolutionData;
    if (anneeParam === 'tout') {
      evolutionData = annees.map(yr => {
        const yf = all.filter(f => getDate(f).getFullYear() === yr);
        return { name: String(yr), value: yf.filter(fn).length, installes: chartFiltre === 'total' ? yf.filter(f => f.status === 'installe').length : 0 };
      });
    } else {
      const yf = all.filter(f => getDate(f).getFullYear() === Number(anneeParam));
      const moisList = moisParam !== 'tout' ? [Number(moisParam)] : Array.from({ length: 12 }, (_, i) => i);
      evolutionData = moisList.map(i => {
        const mf = yf.filter(f => getDate(f).getMonth() === i);
        return { name: MOIS_COURT[i], value: mf.filter(fn).length, installes: chartFiltre === 'total' ? mf.filter(f => f.status === 'installe').length : 0 };
      });
    }

    return NextResponse.json({
      totalSE, b2b, b2c, won, convRate, counts, annees,
      byCity, byLeadType, byCommerce, byCommerceB2C, byProduit,
      recent, evolutionData,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
