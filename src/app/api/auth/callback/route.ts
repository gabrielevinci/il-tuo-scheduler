// src/app/api/auth/callback/route.ts -> VERSIONE MULTI-ACCOUNT CON SESSIONI JWT

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=NoCode', request.url));

  // Logica per ottenere il token a lunga durata (invariata)
  // ... (omessa per brevità, il tuo codice esistente va qui)
  const longLivedToken = 'TOKEN_DA_META'; // Placeholder, usa il tuo codice esistente
  const user_id = 'USER_ID_DA_META'; // Placeholder, usa il tuo codice esistente


  // --- LOGICA DI SESSIONE ---
  let sessionId = request.cookies.get('app_session_id')?.value;
  if (!sessionId) {
    sessionId = nanoid(); // Crea un nuovo ID di sessione se non esiste
  }

  // Salviamo l'account associandolo alla sessione
  await sql`
    INSERT INTO instagram_accounts (instagram_user_id, access_token, app_session_id)
    VALUES (${user_id}, ${longLivedToken}, ${sessionId})
    ON CONFLICT (instagram_user_id)
    DO UPDATE SET access_token = EXCLUDED.access_token, app_session_id = EXCLUDED.app_session_id;
  `;
  
  // Creiamo il JWT e lo impostiamo come cookie
  const jwt = await new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Sessione valida 30 giorni
    .sign(JWT_SECRET);

  const response = NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
  response.cookies.set('app_session_token', jwt, {
    httpOnly: true, // Il cookie non è accessibile da JavaScript nel browser
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS in produzione
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
  });
  // Impostiamo anche un cookie non-httpOnly per riferimento
  response.cookies.set('app_session_id', sessionId, { maxAge: 60 * 60 * 24 * 30 });

  return response;
}