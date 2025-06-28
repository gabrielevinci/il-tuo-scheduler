// src/app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    // NOTA: In un'app reale, qui dovremmo verificare l'identità dell'utente (es. con un token di sessione).
    // Per ora, procediamo, ma teniamolo a mente per la sicurezza futura.
    
    const { videoUrl, caption, scheduledAt } = await request.json();

    // Qui dovremmo recuperare l'ID dell'utente loggato. Per ora usiamo un placeholder.
    // Esempio: const userId = 1; // Sostituire con la logica di autenticazione reale
    
    // --- QUESTA PARTE RICHIEDERÀ UN AGGIORNAMENTO FUTURO ---
    // Al momento non abbiamo un modo per associare questa richiesta all'utente.
    // Per far funzionare il test, assumiamo di salvare per il primo utente nel DB.
    const userResult = await sql`SELECT id FROM instagram_accounts LIMIT 1;`;
    if (userResult.rowCount === 0) {
        return NextResponse.json({ error: 'Nessun utente trovato nel database.' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;
    // --- FINE PARTE DA AGGIORNARE ---


    await sql`
      INSERT INTO scheduled_posts (user_account_id, video_url, caption, scheduled_at)
      VALUES (${userId}, ${videoUrl}, ${caption}, ${scheduledAt});
    `;

    return NextResponse.json({ success: true, message: 'Post programmato con successo.' }, { status: 201 });

  } catch (error) {
    console.error('Errore durante la programmazione del post:', error);
    return NextResponse.json({ error: 'Impossibile programmare il post.' }, { status: 500 });
  }
}