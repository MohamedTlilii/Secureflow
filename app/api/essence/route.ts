import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ensureYear } from '@/lib/essence-helpers';

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('annee') ?? String(new Date().getFullYear());
  const annee = parseInt(raw, 10);
  if (isNaN(annee) || annee < 2020 || annee > 2099) {
    return NextResponse.json({ message: 'Année invalide' }, { status: 400 });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    await ensureYear(annee);
    const mois = await prisma.essence.findMany({
      where: { annee },
      orderBy: { mois: 'asc' },
    });
    return NextResponse.json(mois);
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
