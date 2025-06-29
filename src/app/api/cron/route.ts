// src/app/api/cron/route.ts -> VERSIONE PROFESSIONALE CON RETRY LOGIC

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// --- Funzione helper per eseguire fetch con logica di retry ---
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3
) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (response.ok) {
                return data; // Successo, restituisci i dati
            }
            
            // Controlla se l'errore è transitorio
            if (data.error?.is_transient) {
                if (attempt === maxRetries) {
                    // Ultimo tentativo fallito, lancia l'errore
                    throw new Error(`Errore transitorio dopo ${maxRetries} tentativi: ${JSON.stringify(data.error)}`);
                }
                // Calcola l'attesa esponenziale (2s, 4s, 8s) e riprova
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Errore transitorio rilevato. Tentativo ${attempt}/${maxRetries}. Riprovo tra ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Errore non transitorio, fallisci immediatamente
                throw new Error(`Errore non transitorio: ${JSON.stringify(data.error)}`);
            }

        } catch (error) {
            if (attempt === maxRetries) {
                // Se anche un errore di rete avviene all'ultimo tentativo, lancia l'errore
                throw error;
            }
        }
    }
    // Non dovrebbe mai arrivare qui, ma per sicurezza...
    throw new Error('Impossibile completare la richiesta dopo i tentativi.');
}


// --- Funzione per pubblicare un singolo video ---
async function publishInstagramVideo(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  // Step 1: Creare il container usando la nostra nuova funzione resiliente
  const createContainerUrl = `https://graph.instagram.com/${igUserId}/media`;
  const createContainerParams = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    access_token: accessToken,
  }).toString();
  
  console.log(`Richiesta creazione container a: ${createContainerUrl}`);
  const createData = await fetchWithRetry(`${createContainerUrl}?${createContainerParams}`, { method: 'POST' });

  const creationId = createData.id;
  if (!creationId) throw new Error('ID di creazione non ricevuto da Meta.');
  console.log(`Container creato con ID: ${creationId}.`);
  
  // Step 2: Controllare lo stato (con una pausa iniziale)
  await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa iniziale di 3s
  let status = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 12;

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    console.log(`Controllo stato container... Tentativo ${attempts + 1}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusUrl = `https://graph.instagram.com/${creationId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    status = statusData.status_code;

    if (status === 'ERROR') throw new Error(`Errore durante il caricamento del media: ${JSON.stringify(statusData)}`);
    attempts++;
  }

  if (status !== 'FINISHED') throw new Error(`Timeout: Container non finalizzato.`);
  console.log('Container pronto per la pubblicazione.');

  // Step 3: Pubblicare il container
  const publishUrl = `https://graph.instagram.com/${igUserId}/media_publish`;
  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: accessToken });
  const publishData = await fetchWithRetry(publishUrl, { method: 'POST', body: publishParams });

  return publishData;
}


// --- L'Handler principale per il Cron Job (INVARIATO) ---
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const postsToPublish = await sql`
      SELECT sp.id, sp.video_url, sp.caption, ia.instagram_user_id, ia.access_token
      FROM scheduled_posts sp
      JOIN instagram_accounts ia ON sp.user_account_id = ia.id
      WHERE sp.status = 'PENDING' AND sp.scheduled_at <= NOW();
    `;
    if (postsToPublish.rowCount === 0) return NextResponse.json({ message: 'Nessun post da pubblicare.' });
    for (const post of postsToPublish.rows) {
      try {
        console.log(`Tentativo di pubblicare il post ID: ${post.id}`);
        await publishInstagramVideo(post.instagram_user_id, post.access_token, post.video_url, post.caption);
        await sql`UPDATE scheduled_posts SET status = 'PUBLISHED' WHERE id = ${post.id};`;
        console.log(`Post ID: ${post.id} pubblicato con successo.`);
      } catch (publishError) {
        console.error(`Fallimento nella pubblicazione del post ID: ${post.id}`, publishError);
        await sql`UPDATE scheduled_posts SET status = 'FAILED' WHERE id = ${post.id};`;
      }
    }
    return NextResponse.json({ success: true, published_count: postsToPublish.rowCount });
  } catch (error) {
    console.error('Errore generale nel Cron Job:', error);
    return new NextResponse('Errore interno del server', { status: 500 });
  }
}