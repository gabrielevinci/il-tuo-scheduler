// src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('app_session_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sessionId = payload.sessionId as string;

    const { rows } = await sql`
      SELECT id, instagram_user_id FROM instagram_accounts WHERE app_session_id = ${sessionId};
    `;
    // NOTA: In un'app reale, avremmo bisogno di un modo per ottenere il nome utente di Instagram
    // per mostrare qualcosa di più amichevole dell'ID. Per ora, l'ID è sufficiente.

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}