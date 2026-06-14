import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_SETTINGS } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    return NextResponse.json(settings ?? DEFAULT_SETTINGS);
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

    const { id: _id, updatedAt: _ua, ...data } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: data,
      create: { ...DEFAULT_SETTINGS, ...data, id: 'global' },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
