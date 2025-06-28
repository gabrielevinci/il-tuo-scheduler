// src/app/api/cron/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// --- Funzione per pubblicare un singolo video ---
// Separiamo la logica in una funzione per mantenere il codice pulito
async function publishInstagramVideo(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  // Step 1: Creare il container per il media
  const createContainerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
  const createContainerParams = new URLSearchParams({
    media_type: 'REELS', // O 'VIDEO' se preferisci per il feed
    video_url: videoUrl,
    caption: caption,
    access_token: accessToken,
  });

  const createResponse = await fetch(`${createContainerUrl}?${createContainerParams}`);
  const createData = await createResponse.json();

  if (!createResponse.ok) {
    throw new Error(`Errore nella creazione del container: ${JSON.stringify(createData.error)}`);
  }

  const creationId = createData.id;
  if (!creationId) {
    throw new Error('ID di creazione non ricevuto da Meta.');
  }

  // Step 2: Controllare lo stato del caricamento del container
  let status = 'IN_PROGRESS';
  while (status === 'IN_PROGRESS') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Attendi 5 secondi
    const statusUrl = `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    status = statusData.status_code;

    if (status === 'ERROR') {
      throw new Error(`Errore durante il caricamento del media su Instagram: ${JSON.stringify(statusData)}`);
    }
  }

  // Step 3: Pubblicare il container
  const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const publishResponse = await fetch(`${publishUrl}?${publishParams}`, { method: 'POST' });
  
  if (!publishResponse.ok) {
      const publishData = await publishResponse.json();
      throw new Error(`Errore nella pubblicazione del media: ${JSON.stringify(publishData.error)}`);
  }

  return publishResponse.json();
}


// --- L'Handler principale per la richiesta GET del Cron Job ---
export async function GET(request: NextRequest) {
  // Sicurezza: Controlla un "segreto" per assicurarti che la richiesta provenga da Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Trova i post pronti per essere pubblicati
    const postsToPublish = await sql`
      SELECT
        sp.id,
        sp.video_url,
        sp.caption,
        ia.instagram_user_id,
        ia.access_token
      FROM scheduled_posts sp
      JOIN instagram_accounts ia ON sp.user_account_id = ia.id
      WHERE sp.status = 'PENDING' AND sp.scheduled_at <= NOW();
    `;

    if (postsToPublish.rowCount === 0) {
      return NextResponse.json({ message: 'Nessun post da pubblicare.' });
    }

    // 2. Itera su ogni post e tenta la pubblicazione
    for (const post of postsToPublish.rows) {
      try {
        console.log(`Tentativo di pubblicare il post ID: ${post.id}`);
        await publishInstagramVideo(
          post.instagram_user_id,
          post.access_token,
          post.video_url,
          post.caption
        );

        // Se la pubblicazione va a buon fine, aggiorna lo stato nel DB
        await sql`
          UPDATE scheduled_posts SET status = 'PUBLISHED' WHERE id = ${post.id};
        `;
        console.log(`Post ID: ${post.id} pubblicato con successo.`);

      } catch (publishError) {
        console.error(`Fallimento nella pubblicazione del post ID: ${post.id}`, publishError);
        // Se la pubblicazione fallisce, aggiorna lo stato a 'FAILED' per non riprovare
        await sql`
          UPDATE scheduled_posts SET status = 'FAILED' WHERE id = ${post.id};
        `;
      }
    }

    return NextResponse.json({ success: true, published_count: postsToPublish.rowCount });

  } catch (error) {
    console.error('Errore generale nel Cron Job:', error);
    return new NextResponse('Errore interno del server', { status: 500 });
  }
}