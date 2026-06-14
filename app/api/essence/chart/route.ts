import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export async function GET(req: NextRequest) {
  const raw   = new URL(req.url).searchParams.get('annee') ?? String(new Date().getFullYear());
  const annee = parseInt(raw, 10);
  if (isNaN(annee)) return NextResponse.json({ message: 'Année invalide' }, { status: 400 });

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const mois = await prisma.essence.findMany({ where: { annee }, orderBy: { mois: 'asc' } });

    let cumAtt = 0, cumRec = 0;
    const chartData = mois.map(m => {
      cumAtt += m.montantAttendu;
      cumRec += m.recu ? m.montantAttendu : 0;
      return {
        name:    MOIS_COURT[m.mois],
        Attendu: m.montantAttendu,
        Reçu:    m.recu ? m.montantAttendu : 0,
        cumAtt,
        cumRec,
        recu:    m.recu,
      };
    });

    return NextResponse.json({ chartData });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
