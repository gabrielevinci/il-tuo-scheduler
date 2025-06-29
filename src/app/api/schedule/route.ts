// src/app/api/schedule/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { jwtVerify } from 'jose';

// Carichiamo lo stesso segreto usato per firmare e verificare i JWT
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(request: NextRequest) {
  // 1. Verifichiamo che l'utente abbia una sessione valida
  const token = request.cookies.get('app_session_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No session token' }, { status: 401 });
  }

  try {
    // 2. Verifichiamo la firma e la validità del token per ottenere la sessione
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sessionId = payload.sessionId as string;

    if (!sessionId) {
      throw new Error('Invalid session ID in token');
    }

    // 3. Estraiamo i dati inviati dal frontend
    const { videoUrl, caption, scheduledAt, accountId } = await request.json();

    // Validazione dei dati ricevuti
    if (!videoUrl || !scheduledAt || !accountId) {
      return NextResponse.json({ error: 'Dati mancanti per la programmazione.' }, { status: 400 });
    }

    // 4. Query di sicurezza: verifichiamo che l'account appartenga a questa sessione
    // Questo è un controllo cruciale per un'architettura multi-tenant.
    const verificationResult = await sql`
        SELECT id FROM instagram_accounts 
        WHERE id = ${accountId} AND app_session_id = ${sessionId};
    `;

    if (verificationResult.rowCount === 0) {
      // Se non troviamo una corrispondenza, l'utente sta cercando di usare un ID account
      // che non gli appartiene. Rifiutiamo la richiesta.
      return NextResponse.json({ error: 'Forbidden: Account access denied.' }, { status: 403 });
    }

    // 5. Se tutti i controlli passano, inseriamo il post nel database
    await sql`
      INSERT INTO scheduled_posts (user_account_id, video_url, caption, scheduled_at)
      VALUES (${accountId}, ${videoUrl}, ${caption}, ${new Date(scheduledAt).toISOString()});
    `;

    return NextResponse.json({ success: true, message: 'Post programmato con successo.' }, { status: 201 });

  } catch (error) {
    console.error('Errore durante la programmazione del post:', error);
    if ((error as any).name === 'JWTExpired' || (error as any).code?.includes('ERR_JWT')) {
        return NextResponse.json({ error: 'Token non valido o scaduto.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}