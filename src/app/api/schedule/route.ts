// src/app/api/schedule/route.ts -> VERSIONE MULTI-ACCOUNT
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
// Importa la logica di verifica JWT
import { jwtVerify } from 'jose';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);


export async function POST(request: NextRequest) {
  // Verifica la sessione per sicurezza
  const token = request.cookies.get('app_session_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sessionId = payload.sessionId as string;

    // Riceviamo l'ID dell'account dal frontend
    const { videoUrl, caption, scheduledAt, accountId } = await request.json();

    // Verifica che l'account appartenga alla sessione corrente
    const { rowCount } = await sql`
        SELECT id FROM instagram_accounts 
        WHERE id = ${accountId} AND app_session_id = ${sessionId};
    `;
    if (rowCount === 0) {
        return NextResponse.json({ error: 'Account non valido o non appartenente a questa sessione.' }, { status: 403 });
    }

    await sql`
      INSERT INTO scheduled_posts (user_account_id, video_url, caption, scheduled_at)
      VALUES (${accountId}, ${videoUrl}, ${caption}, ${scheduledAt});
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Errore durante la programmazione:', error);
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 });
  }
}