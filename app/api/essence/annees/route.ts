import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const rows = await prisma.essence.findMany({
      select: { annee: true },
      distinct: ['annee'],
      orderBy: { annee: 'asc' },
    });
    return NextResponse.json(rows.map((r) => r.annee));
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
