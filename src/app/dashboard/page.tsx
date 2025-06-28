// src/app/dashboard/page.tsx

export default function DashboardPage() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold">Autenticazione Riuscita!</h1>
          <p className="text-lg text-gray-400">
            Il tuo account Instagram è stato collegato con successo.
          </p>
          <p className="text-sm text-gray-500">
            Controlla la console del server per vedere il tuo access token.
          </p>
        </div>
      </main>
    );
  }