import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

  const raw   = req.nextUrl.searchParams.get('annee') ?? String(new Date().getFullYear());
  const annee = parseInt(raw, 10);
  if (isNaN(annee) || annee < 2020 || annee > 2099) {
    return NextResponse.json({ message: 'Année invalide' }, { status: 400 });
  }

  try {
    const mois = await prisma.essence.findMany({ where: { annee } });
    const totalAttendu = mois.reduce((s, m) => s + m.montantAttendu, 0);
    const totalRecu    = mois.filter((m) => m.recu).reduce((s, m) => s + m.montantAttendu, 0);
    return NextResponse.json({
      totalAttendu,
      totalRecu,
      totalManquant: totalAttendu - totalRecu,
      pctRecu: totalAttendu > 0 ? Math.round((totalRecu / totalAttendu) * 100) : 0,
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
