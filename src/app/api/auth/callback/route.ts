// src/app/api/auth/callback/route.ts -> VERSIONE FINALE CON SALVATAGGIO SU DB

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres'; // Importiamo il "traduttore" per il DB

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=NoCode', request.url));
  }

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`;

  const params = new URLSearchParams();
  params.append('client_id', clientId!);
  params.append('client_secret', clientSecret!);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', redirectUri);
  params.append('code', code);

  try {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Errore ricevuto da Meta API:', data);
      return NextResponse.redirect(new URL(`/?error=${data.error_message || 'TokenExchangeFailed'}`, request.url));
    }

    const { access_token, user_id } = data;

    // --- LOGICA DI SALVATAGGIO NEL DATABASE ---
    // Questa è la nuova parte. Usiamo una query "UPSERT".
    // Se l'utente esiste già, aggiorniamo il suo token (ON CONFLICT... DO UPDATE).
    // Se non esiste, lo inseriamo (INSERT). È una query robusta e a prova di errore.
    await sql`
      INSERT INTO instagram_accounts (instagram_user_id, access_token)
      VALUES (${user_id}, ${access_token})
      ON CONFLICT (instagram_user_id)
      DO UPDATE SET access_token = EXCLUDED.access_token;
    `;
    
    console.log(`✅ Token per l'utente ${user_id} salvato/aggiornato con successo nel database.`);

    // Reindirizziamo l'utente alla sua dashboard di produzione.
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);

  } catch (error) {
    console.error('Errore critico durante il callback:', error);
    return NextResponse.redirect(new URL('/?error=CriticalCallbackError', request.url));
  }
}