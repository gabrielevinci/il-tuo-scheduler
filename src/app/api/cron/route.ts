// src/app/api/cron/route.ts -> VERSIONE FINALE CON GESTIONE DEGLI ID COME STRINGHE

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Assicuriamo che TypeScript tratti sempre l'ID come una stringa
async function publishInstagramVideo(
  igUserId: string, // Tipo esplicito: string
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  // Rimuoviamo il workaround precedente, era un sintomo e non la cura.
  // L'ID utente viene ora usato così com'è, come una stringa.
  console.log(`Utilizzo l'ID utente come stringa: ${igUserId}`);

  const apiVersion = process.env.META_API_VERSION || 'v23.0';

  // Step 1: Creare il container
  const createContainerUrl = `https://graph.instagram.com/${apiVersion}/${igUserId}/video_reels`;
  const createContainerParams = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    access_token: accessToken,
  });

  const createResponse = await fetch(createContainerUrl, { method: 'POST', body: createContainerParams });
  const createData = await createResponse.json();

  if (!createResponse.ok) {
    console.error("Dettagli Errore Creazione Container:", createData);
    throw new Error(`Errore nella creazione del container: ${JSON.stringify(createData.error)}`);
  }
  const creationId = createData.id;
  if (!creationId) throw new Error('ID di creazione non ricevuto da Meta.');
  console.log(`Container creato con ID: ${creationId}.`);

  // Step 2: Controllare lo stato del caricamento
  let status = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 12;
  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    console.log(`Controllo stato container... Tentativo ${attempts + 1}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusUrl = `https://graph.instagram.com/${apiVersion}/${creationId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    status = statusData.status_code;
    
    if (status === 'ERROR') {
      console.error("Dettagli Errore Stato Container:", statusData);
      throw new Error(`Errore durante il caricamento del media: ${JSON.stringify(statusData)}`);
    }
    attempts++;
  }
  if (status !== 'FINISHED') throw new Error(`Timeout: Il container non è passato allo stato FINISHED.`);
  console.log('Container pronto per la pubblicazione.');

  // Step 3: Pubblicare il container
  const publishUrl = `https://graph.instagram.com/${apiVersion}/${igUserId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishResponse = await fetch(publishUrl, { method: 'POST', body: publishParams });
  if (!publishResponse.ok) {
      const publishData = await publishResponse.json();
      console.error("Dettagli Errore Pubblicazione:", publishData);
      throw new Error(`Errore nella pubblicazione del media: ${JSON.stringify(publishData.error)}`);
  }
  return publishResponse.json();
}

// --- L'Handler principale per la richiesta GET del Cron Job ---
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now_utc = new Date().toISOString();
    
    // La libreria @vercel/postgres è intelligente e rispetta i tipi del DB.
    // Poiché instagram_user_id è VARCHAR, verrà restituito come stringa.
    const postsToPublish = await sql`
      SELECT
        sp.id,
        sp.video_url,
        sp.caption,
        ia.instagram_user_id,
        ia.access_token
      FROM scheduled_posts sp
      JOIN instagram_accounts ia ON sp.user_account_id = ia.id
      WHERE sp.status = 'PENDING' AND sp.scheduled_at <= ${now_utc};
    `;

    if (postsToPublish.rowCount === 0) {
      return NextResponse.json({ message: 'Nessun post da pubblicare.' });
    }

    for (const post of postsToPublish.rows) {
      try {
        console.log(`Tentativo di pubblicare il post ID: ${post.id}`);
        // Passiamo l'ID direttamente come stringa, come ricevuto dal database.
        await publishInstagramVideo(
          post.instagram_user_id,
          post.access_token,
          post.video_url,
          post.caption
        );

        await sql`
          UPDATE scheduled_posts SET status = 'PUBLISHED' WHERE id = ${post.id};
        `;
        console.log(`Post ID: ${post.id} pubblicato con successo.`);

      } catch (publishError) {
        console.error(`Fallimento nella pubblicazione del post ID: ${post.id}`, publishError);
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