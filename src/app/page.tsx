// src/app/page.tsx -> VERSIONE FINALE CON SCOPE DI PERMESSI COMPLETO

import Link from 'next/link';

export default function HomePage() {
  // Leggiamo l'ID della nostra App Meta in modo sicuro
  const clientId = process.env.META_APP_ID;

  // L'URI a cui Meta dovrà reindirizzare l'utente
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`;

  // --- LA MODIFICA CHIAVE ---
  // Definiamo lo scope completo con tutti i permessi necessari per la pubblicazione stabile,
  // come da documentazione e best practice della community.
  const requiredPermissions = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'business_management'
  ];
  const scope = requiredPermissions.join(',');

  // Costruiamo l'URL di autorizzazione completo
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&response_type=code`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Il Tuo Scheduler per Instagram
        </h1>
        <p className="text-lg text-gray-400">
          Collega il tuo account per iniziare a programmare i tuoi video.
        </p>
        {/* Usiamo un Link per coerenza, ma per un reindirizzamento esterno <a> è corretto */}
        <a
          href={authUrl}
          className="inline-block rounded-md bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Collega Account Instagram
        </a>
      </div>
    </main>
  );
}