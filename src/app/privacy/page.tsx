// src/app/privacy/page.tsx

export default function PrivacyPolicyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-8 text-white">
      <div className="prose prose-invert w-full max-w-4xl rounded-lg bg-gray-800 p-8 shadow-2xl">
        <h1>Informativa sulla Privacy per MioSchedulerNextJS</h1>
        <p>
          <strong>Ultimo aggiornamento:</strong> 29 Giugno 2025
        </p>

        <h2>1. Introduzione</h2>
        <p>
          Benvenuto/a nell'informativa sulla privacy di MioSchedulerNextJS ("l'Applicazione").
          Questa applicazione ti consente di collegare il tuo account Instagram per programmare e pubblicare
          contenuti video. La tua privacy è importante per noi. Questa informativa spiega quali dati raccogliamo
          e come li utilizziamo.
        </p>

        <h2>2. Dati che Raccogliamo</h2>
        <p>
          Quando colleghi il tuo account Instagram alla nostra Applicazione, riceviamo e memorizziamo i seguenti
          dati forniti dall'API di Meta:
        </p>
        <ul>
          <li>
            <strong>ID Utente Instagram:</strong> Un identificatore numerico univoco per il tuo account Instagram,
            necessario per indirizzare le richieste API al tuo profilo.
          </li>
          <li>
            <strong>Token di Accesso:</strong> Una chiave crittografica sicura che ci autorizza a pubblicare
            contenuti per tuo conto. Questo token viene memorizzato in modo sicuro e crittografato nel nostro database.
          </li>
        </ul>
        <p>
          Non raccogliamo, memorizziamo o elaboriamo altre informazioni personali come la tua email, password,
          nome, o i dati dei tuoi follower.
        </p>

        <h2>3. Come Utilizziamo i Tuoi Dati</h2>
        <p>
          Utilizziamo i dati raccolti esclusivamente per fornire la funzionalità principale dell'Applicazione:
        </p>
        <ul>
          <li>
            L'<strong>ID Utente Instagram</strong> e il <strong>Token di Accesso</strong> vengono utilizzati per
            comunicare con le API di Meta per pubblicare i video che hai programmato all'ora da te stabilita.
          </li>
        </ul>

        <h2>4. Memorizzazione e Sicurezza dei Dati</h2>
        <p>
          I tuoi dati (ID Utente e Token di Accesso) sono memorizzati in un database sicuro ospitato su Vercel Postgres.
          Adottiamo misure di sicurezza standard del settore per proteggere i tuoi dati da accessi non autorizzati.
          I token di accesso sono trattati come dati sensibili.
        </p>

        <h2>5. Condivisione dei Dati</h2>
        <p>
          Non condividiamo, vendiamo, noleggiamo o scambiamo i tuoi dati con terze parti per scopi di marketing o
          altri scopi. I dati vengono utilizzati solo per le interazioni necessarie con le API di Meta.
        </p>
        
        <h2>6. Contatti</h2>
        <p>
          Per qualsiasi domanda relativa a questa informativa sulla privacy, puoi contattarci all'indirizzo gabriele2019vinci@gmail.com.
        </p>
      </div>
    </main>
  );
}