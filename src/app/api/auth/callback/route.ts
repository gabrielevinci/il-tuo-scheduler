// src/app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';

// Carichiamo il segreto per firmare i nostri token di sessione
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(request: NextRequest) {
  // Estraiamo il codice di autorizzazione da Meta
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    const errorDescription = request.nextUrl.searchParams.get('error_description');
    return NextResponse.redirect(new URL(`/?error=${errorDescription || 'NoCode'}`, request.nextUrl.origin));
  }

  // Recuperiamo le nostre credenziali
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`;

  try {
    // --- STEP 1: OTTENERE IL TOKEN A BREVE DURATA ---
    const shortLivedTokenParams = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });
    const shortLivedTokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: shortLivedTokenParams,
    });
    const shortLivedData = await shortLivedTokenResponse.json();
    if (!shortLivedTokenResponse.ok) throw new Error(`Errore ottenendo token a breve durata: ${JSON.stringify(shortLivedData.error)}`);
    const { access_token: shortLivedToken, user_id } = shortLivedData;

    // --- STEP 2: SCAMBIO PER TOKEN A LUNGA DURATA ---
    const longLivedTokenParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: clientSecret!,
      access_token: shortLivedToken,
    });
    const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?${longLivedTokenParams}`);
    const longLivedData = await longLivedTokenResponse.json();
    if (!longLivedTokenResponse.ok) throw new Error(`Errore ottenendo token a lunga durata: ${JSON.stringify(longLivedData.error)}`);
    const { access_token: longLivedToken } = longLivedData;

    // --- STEP 3: GESTIONE DELLA SESSIONE UTENTE ---
    // Controlliamo se l'utente ha già un cookie di sessione
    let sessionId = request.cookies.get('app_session_id')?.value;
    if (!sessionId) {
      // Se non ce l'ha, ne creiamo uno nuovo, unico e casuale
      sessionId = nanoid(24); 
    }

    // --- STEP 4: SALVATAGGIO DELL'ACCOUNT ASSOCIATO ALLA SESSIONE ---
    await sql`
      INSERT INTO instagram_accounts (instagram_user_id, access_token, app_session_id)
      VALUES (${user_id}, ${longLivedToken}, ${sessionId})
      ON CONFLICT (instagram_user_id)
      DO UPDATE SET 
        access_token = EXCLUDED.access_token, 
        app_session_id = EXCLUDED.app_session_id;
    `;

    // --- STEP 5: CREAZIONE DEL JWT E IMPOSTAZIONE DEI COOKIE ---
    // Creiamo un token di sessione sicuro (JWT) che contiene l'ID della sessione
    const jwt = await new SignJWT({ sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // La sessione dura 30 giorni
      .sign(JWT_SECRET);

    // Prepariamo la risposta per reindirizzare l'utente alla dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));

    // Impostiamo il JWT come un cookie httpOnly per la massima sicurezza
    response.cookies.set('app_session_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni in secondi
    });
    // Impostiamo anche l'ID di sessione in un cookie separato, accessibile dal client
    response.cookies.set('app_session_id', sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;

  } catch (error) {
    console.error('Errore critico durante il callback:', error);
    return NextResponse.redirect(new URL('/?error=CriticalCallbackError', request.nextUrl.origin));
  }
}