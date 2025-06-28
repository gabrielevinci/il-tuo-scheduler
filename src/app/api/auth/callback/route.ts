// src/app/api/auth/callback/route.ts -> VERSIONE FINALE CON TOKEN A LUNGA DURATA

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=NoCode', request.url));
  }

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
    if (!shortLivedTokenResponse.ok) {
      throw new Error(`Errore ottenendo token a breve durata: ${JSON.stringify(shortLivedData.error)}`);
    }

    const { access_token: shortLivedToken, user_id } = shortLivedData;

    // --- STEP 2: SCAMBIO PER TOKEN A LUNGA DURATA ---
    const longLivedTokenParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: clientSecret!,
      access_token: shortLivedToken,
    });
    
    const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?${longLivedTokenParams}`);
    const longLivedData = await longLivedTokenResponse.json();

    if (!longLivedTokenResponse.ok) {
        throw new Error(`Errore ottenendo token a lunga durata: ${JSON.stringify(longLivedData.error)}`);
    }

    const { access_token: longLivedToken } = longLivedData; // Questo è il token valido 60 giorni

    // --- STEP 3: SALVATAGGIO DEL TOKEN A LUNGA DURATA NEL DATABASE ---
    await sql`
      INSERT INTO instagram_accounts (instagram_user_id, access_token)
      VALUES (${user_id}, ${longLivedToken})
      ON CONFLICT (instagram_user_id)
      DO UPDATE SET access_token = EXCLUDED.access_token;
    `;
    
    console.log(`✅ Token a LUNGA durata per l'utente ${user_id} salvato/aggiornato.`);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);

  } catch (error) {
    console.error('Errore critico durante il callback:', error);
    return NextResponse.redirect(new URL('/?error=CriticalCallbackError', request.url));
  }
}