import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_SETTINGS } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

    // Champ nouveau — le Prisma client ne le sélectionne pas encore
    let produitsAvecQualification: string[] = DEFAULT_SETTINGS.produitsAvecQualification;
    try {
      const raw = await prisma.$queryRawUnsafe<{ produitsAvecQualification: unknown }[]>(
        `SELECT "produitsAvecQualification" FROM "Settings" WHERE id = 'global'`
      );
      if (Array.isArray(raw[0]?.produitsAvecQualification)) {
        produitsAvecQualification = raw[0].produitsAvecQualification as string[];
      }
    } catch { /* colonne pas encore connue */ }

    return NextResponse.json({ ...(settings ?? DEFAULT_SETTINGS), produitsAvecQualification });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const body = await req.json();

    const arrayFields = ['villes', 'typeCommerce', 'typeLead', 'qualificationSysteme', 'services', 'motifsAnnulation', 'produitsAvecQualification'];
    for (const f of arrayFields) {
      if (body[f] !== undefined && !Array.isArray(body[f])) {
        return NextResponse.json({ message: `${f} doit être un tableau` }, { status: 400 });
      }
    }

    // Sépare le nouveau champ du reste — le Prisma client ne le connaît pas encore
    const { id: _id, updatedAt: _ua, produitsAvecQualification, ...data } = body;

    const settings = await prisma.settings.upsert({
      where:  { id: 'global' },
      update: data,
      create: { ...DEFAULT_SETTINGS, ...data, id: 'global' },
    });

    // Persiste le nouveau champ via SQL brut (colonne peut ne pas exister encore)
    if (produitsAvecQualification !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Settings" SET "produitsAvecQualification" = $1::jsonb WHERE id = 'global'`,
          JSON.stringify(produitsAvecQualification)
        );
      } catch { /* colonne pas encore créée — db push requis */ }
    }

    return NextResponse.json({
      ...settings,
      produitsAvecQualification: produitsAvecQualification ?? DEFAULT_SETTINGS.produitsAvecQualification,
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
