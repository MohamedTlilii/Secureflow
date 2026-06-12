import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }); }

    const { name, role, email, dateDebut, avatar, newPassword } = body as {
      name?: string; role?: string; email?: string; dateDebut?: string | null;
      avatar?: string | null; newPassword?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (name      !== undefined) updateData.name      = String(name).trim();
    if (role      !== undefined) updateData.role      = String(role).trim();
    if (email     !== undefined) updateData.email     = String(email).trim().toLowerCase();
    if (avatar    !== undefined) updateData.avatar    = avatar || null;
    if (dateDebut !== undefined) updateData.dateDebut = dateDebut ? new Date(dateDebut + 'T12:00:00') : null;

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return NextResponse.json({ error: 'Mot de passe trop court (min. 6 caractères)' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(String(newPassword), 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, avatar: true, dateDebut: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
