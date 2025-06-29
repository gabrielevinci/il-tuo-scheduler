// src/app/api/accounts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { jwtVerify } from 'jose';

// Carichiamo lo stesso segreto usato per firmare il JWT
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(request: NextRequest) {
  // 1. Leggiamo il cookie di sessione sicuro dalla richiesta
  const token = request.cookies.get('app_session_token')?.value;

  if (!token) {
    // Se non c'è il token, l'utente non è autorizzato
    return NextResponse.json({ error: 'Unauthorized: No session token' }, { status: 401 });
  }

  try {
    // 2. Verifichiamo la validità e la firma del token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sessionId = payload.sessionId as string;

    if (!sessionId) {
      // Se il token è valido ma non contiene un ID di sessione, c'è un problema
      throw new Error('Invalid session ID in token');
    }

    // 3. Usiamo l'ID di sessione per interrogare il database in modo sicuro
    // Selezioniamo solo gli account che appartengono a questa specifica sessione
    const { rows } = await sql`
      SELECT id, instagram_user_id FROM instagram_accounts 
      WHERE app_session_id = ${sessionId};
    `;
    
    // 4. Restituiamo la lista di account al frontend
    return NextResponse.json(rows);
    
  } catch (error) {
    // Se la verifica del token fallisce (es. è scaduto o manomesso), neghiamo l'accesso
    console.error("Authentication error:", error);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}