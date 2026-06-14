import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('annee') ?? String(new Date().getFullYear());

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const where = raw === 'tout' ? {} : (() => {
      const annee = parseInt(raw, 10);
      if (isNaN(annee) || annee < 2020 || annee > 2099) return null;
      return { annee };
    })();
    if (where === null) return NextResponse.json({ message: 'Année invalide' }, { status: 400 });

    const now  = new Date();
    const mois = await prisma.essence.findMany({
      where,
      orderBy: [{ annee: 'asc' }, { mois: 'asc' }],
    });
    // Exclude future months from stats
    const visible = mois.filter(m => m.annee < now.getFullYear() || (m.annee === now.getFullYear() && m.mois <= now.getMonth()));
    const totalAttendu = visible.reduce((s, m) => s + m.montantAttendu, 0);
    const totalRecu    = visible.filter(m => m.recu).reduce((s, m) => s + m.montantAttendu, 0);
    const moisRecus    = visible.filter(m => m.recu).length;
    const moisTotal    = visible.length;
    return NextResponse.json({
      totalAttendu,
      totalRecu,
      totalManquant: Math.max(0, totalAttendu - totalRecu),
      pctRecu: totalAttendu > 0 ? Math.round((totalRecu / totalAttendu) * 100) : 0,
      moisRecus,
      moisTotal,
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
