// src/app/dashboard/page.tsx

'use client'; // -> Questa direttiva è FONDAMENTALE. Rende il componente interattivo.

import { useState } from 'react';

export default function DashboardPage() {
  // Stati per gestire i dati del form e lo stato di caricamento
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  // Gestore per la selezione del file
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  // Funzione principale che gestisce il submit del form
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Impedisce al form di ricaricare la pagina
    if (!file || !caption || !scheduledAt) {
      setMessage('Per favore, compila tutti i campi.');
      return;
    }

    setIsUploading(true);
    setMessage('Inizio del processo di upload...');

    try {
      // --- Step 1: Richiesta dell'URL di Upload Sicuro ---
      setMessage('1/3: Richiesta autorizzazione per l-upload...');
      const urlResponse = await fetch('/api/upload/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!urlResponse.ok) throw new Error('Fallimento nella richiesta dell-URL di upload.');

      const { url: presignedUrl } = await urlResponse.json();
      setMessage('2/3: Autorizzazione ricevuta. Caricamento del file su DigitalOcean...');

      // --- Step 2: Upload Diretto del File a DigitalOcean ---
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Fallimento nell-upload del file.');
      
      // const fileUrl = presignedUrl.split('?')[0]; // Otteniamo l'URL pulito del file
      setMessage('3/3: Upload completato. Salvataggio della programmazione...');

      // --- Step 3: Salvataggio dei Metadati nel Nostro Database ---
      // (Creeremo questo endpoint nel prossimo passaggio)
      /* 
      const scheduleResponse = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: fileUrl,
          caption: caption,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      if (!scheduleResponse.ok) throw new Error('Fallimento nella programmazione del post.'); 
      */

      setMessage('Successo! Il tuo video è stato programmato.');
      // Reset del form
      setFile(null);
      setCaption('');
      setScheduledAt('');

    } catch (error) {
      console.error(error);
      setMessage(`Errore: ${error instanceof Error ? error.message : 'Si è verificato un problema.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold">
          Programma un Nuovo Video
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selettore File */}
          <div>
            <label htmlFor="file-upload" className="mb-2 block font-semibold text-gray-300">
              Video da Caricare
            </label>
            <input
              id="file-upload"
              type="file"
              accept="video/mp4,video/quicktime" // Limitiamo ai formati video comuni
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
              disabled={isUploading}
            />
          </div>

          {/* Didascalia */}
          <div>
            <label htmlFor="caption" className="mb-2 block font-semibold text-gray-300">
              Didascalia
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500"
              rows={4}
              placeholder="Scrivi qui la tua didascalia..."
              disabled={isUploading}
            />
          </div>

          {/* Selettore Data e Ora */}
          <div>
            <label htmlFor="scheduledAt" className="mb-2 block font-semibold text-gray-300">
              Data e Ora di Pubblicazione
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500"
              disabled={isUploading}
            />
          </div>

          {/* Pulsante di Submit */}
          <button
            type="submit"
            className="w-full rounded-md bg-green-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
            disabled={isUploading}
          >
            {isUploading ? 'Programmazione in corso...' : 'Programma Video'}
          </button>
        </form>

        {/* Messaggi di Stato */}
        {message && (
          <p className="mt-6 text-center font-semibold text-gray-300">{message}</p>
        )}
      </div>
    </main>
  );
}