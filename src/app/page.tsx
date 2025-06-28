// src/app/page.tsx

export default function HomePage() {
  // Leggiamo l'ID della nostra App Meta in modo sicuro dalle variabili d'ambiente del server.
  // Questa variabile non sarà MAI esposta al browser dell'utente.
  const clientId = process.env.META_APP_ID;

  // Definiamo l'URI a cui Meta dovrà reindirizzare l'utente dopo il login.
  // Deve corrispondere ESATTAMENTE a quello inserito nel pannello sviluppatori di Meta.
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`;

  // Specifichiamo i permessi (scopes) che la nostra applicazione richiede.
  // Come da documentazione, usiamo i nuovi nomi degli scope.
  const scope = "instagram_business_basic,instagram_business_content_publish";

  // Costruiamo l'URL di autorizzazione completo.
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