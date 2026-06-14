import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const now         = new Date();
    const curYear     = now.getFullYear();
    const curMois     = now.getMonth();
    const raw         = req.nextUrl.searchParams.get('annee');
    const annee       = raw ? parseInt(raw, 10) : curYear;

    // Pour l'année courante : auto-créer les mois jusqu'au mois actuel
    if (annee === curYear) {
      await Promise.all(
        Array.from({ length: curMois + 1 }, (_, mois) =>
          prisma.essence.upsert({
            where:  { annee_mois: { annee, mois } },
            update: {},
            create: { annee, mois, joursOuvres: 0, montantParJour: 0, montantAttendu: 0 },
          })
        )
      );
    }

    const mois = await prisma.essence.findMany({
      where:   { annee },
      orderBy: { mois: 'asc' },
    });

    return NextResponse.json(mois);
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
