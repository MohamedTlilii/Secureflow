import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Inscription désactivée' }, { status: 403 });
}
