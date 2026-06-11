import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 }); }

  try {
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (email.length > 254 || password.length > 128) {
      return NextResponse.json({ message: 'Données invalides' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Email invalide' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ message: 'Email ou mot de passe incorrect' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: 'Email ou mot de passe incorrect' }, { status: 401 });
    }
    const token = signToken(user.id);
    const { password: _, ...userSafe } = user;
    return NextResponse.json({ token, user: userSafe });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
