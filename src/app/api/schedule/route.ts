// src/app/api/schedule/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

interface ErrorWithCode extends Error {
  code?: string;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('app_session_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await jwtVerify(token, JWT_SECRET);

    const { videoUrl, caption, scheduledAt, accountId } = await request.json();

    if (!videoUrl || !scheduledAt || !accountId) {
      return NextResponse.json({ error: 'Dati mancanti per la programmazione.' }, { status: 400 });
    }

    // --- LA MODIFICA CHIAVE ---
    // Salviamo direttamente la stringa UTC ricevuta dal frontend, senza conversioni.
    await sql`
      INSERT INTO scheduled_posts (user_account_id, video_url, caption, scheduled_at)
      VALUES (${accountId}, ${videoUrl}, ${caption}, ${scheduledAt});
    `;

    return NextResponse.json({ success: true, message: 'Post programmato.' }, { status: 201 });

  } catch (error) {
    console.error('Errore durante la programmazione:', error);
    const typedError = error as ErrorWithCode;
    if (typedError.name === 'JWTExpired' || typedError.code?.includes('ERR_JWT')) {
        return NextResponse.json({ error: 'Token non valido o scaduto.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}