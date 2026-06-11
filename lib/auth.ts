import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) throw new Error('JWT_SECRET non défini dans les variables d\'environnement');
const JWT_SECRET: string = _rawSecret;

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export function signToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  });
}
