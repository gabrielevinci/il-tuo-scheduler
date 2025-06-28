// src/app/api/auth/callback/route.ts -> VERSIONE MIGLIORATA CON DEBUG AVANZATO

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("--- Inizio processo di callback API ---");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    console.error("ERRORE: il parametro 'code' non è stato trovato nella URL.");
    return NextResponse.redirect(new URL("/?error=NoCode", request.url));
  }
  console.log(`Codice di autorizzazione ricevuto: ${code.substring(0, 30)}...`);

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  // Utilizziamo l'URL ngrok anche qui per coerenza assoluta
  const redirectUri = "https://624c-93-65-240-51.ngrok-free.app/api/auth/callback";

  const params = new URLSearchParams();
  params.append("client_id", clientId!);
  params.append("client_secret", clientSecret!);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", redirectUri);
  params.append("code", code);

  try {
    console.log("Sto tentando di scambiare il codice per un access token...");
    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    
    // Convertiamo la risposta in JSON, indipendentemente dallo stato
    const data = await response.json();

    // Controlliamo se la risposta NON è andata a buon fine (status non 2xx)
    if (!response.ok) {
      console.error("!!! ERRORE RICEVUTO DA META API !!!");
      console.error(`Stato della risposta: ${response.status} ${response.statusText}`);
      console.error("Dettagli dell'errore:", data); // Stampiamo il corpo dell'errore
      return NextResponse.redirect(new URL(`/?error=${data.error_message || 'TokenExchangeFailed'}`, request.url));
    }

    // Se siamo qui, la risposta è OK
    const { access_token, user_id } = data;

    console.log("✅ Access Token ricevuto:", access_token);
    console.log("👤 User ID Instagram:", user_id);
    
    console.log("--- Fine processo di callback API. Reindirizzamento a /dashboard ---");
    return NextResponse.redirect("https://624c-93-65-240-51.ngrok-free.app/dashboard");

  } catch (error) {
    console.error("!!! ERRORE CRITICO DURANTE LA CHIAMATA FETCH !!!");
    console.error(error);
    return NextResponse.redirect(new URL("/?error=CriticalFetchError", request.url));
  }
}