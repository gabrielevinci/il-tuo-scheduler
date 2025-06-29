// src/app/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';

// Definiamo un "tipo" per gli account, per un codice più pulito e sicuro
interface InstagramAccount {
  id: number;
  instagram_user_id: string;
}

export default function DashboardPage() {
  // Stati per la gestione degli account
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // Usiamo stringa per il valore del select
  
  // Stati per il form
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Stati per l'interfaccia utente
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  // Questo "effetto" viene eseguito una sola volta, quando il componente appare
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/accounts');
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
          if (data.length === 0) {
            setMessage('Nessun account collegato. Inizia collegandone uno.');
          }
        } else {
          setMessage('Sessione non valida o scaduta. Per favore, ricollega un account.');
        }
      } catch (error) {
        setMessage('Impossibile caricare gli account. Verifica la connessione.');
      }
    }
    fetchAccounts();
  }, []); // L'array vuoto [] assicura che venga eseguito solo una volta

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !caption || !scheduledAt || !selectedAccountId) {
      setMessage('Per favore, seleziona un account e compila tutti i campi.');
      return;
    }

    setIsProcessing(true);
    setMessage('Inizio del processo...');

    try {
      // Step 1: Richiesta URL di Upload
      setMessage('1/3: Richiesta autorizzazione...');
      const urlResponse = await fetch('/api/upload/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlResponse.ok) throw new Error('Fallimento richiesta URL di upload.');
      const { url: presignedUrl } = await urlResponse.json();

      // Step 2: Upload del File
      setMessage('2/3: Caricamento del file...');
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
      });
      if (!uploadResponse.ok) throw new Error('Fallimento upload file.');
      
      const fileUrl = presignedUrl.split('?')[0];
      setMessage('3/3: Salvataggio programmazione...');

      // Step 3: Salvataggio dei Metadati con l'ID dell'Account Selezionato
      const scheduleResponse = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: fileUrl,
          caption,
          scheduledAt,
          accountId: Number(selectedAccountId), // Inviamo l'ID dell'account
        }),
      });
      if (!scheduleResponse.ok) throw new Error('Fallimento programmazione post.');

      setMessage('Successo! Il tuo video è stato programmato.');
      // Reset del form
      setFile(null); setCaption(''); setScheduledAt(''); setSelectedAccountId('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error(error);
      setMessage(`Errore: ${error instanceof Error ? error.message : 'Si è verificato un problema.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold">Programma un Nuovo Video</h1>
        
        <div className="mb-6">
            <label htmlFor="account-select" className="mb-2 block font-semibold text-gray-300">Scegli un Account</label>
            <select 
                id="account-select" 
                value={selectedAccountId} 
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                disabled={accounts.length === 0 || isProcessing}>
                <option value="" disabled>Seleziona un account...</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        Account ID: {acc.instagram_user_id}
                    </option>
                ))}
            </select>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="file-upload" className="mb-2 block font-semibold text-gray-300">Video da Caricare</label>
                <input id="file-upload" type="file" accept="video/mp4,video/quicktime" onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                    disabled={isProcessing} />
            </div>
            <div>
                <label htmlFor="caption" className="mb-2 block font-semibold text-gray-300">Didascalia</label>
                <textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)}
                    className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500"
                    rows={4} placeholder="Scrivi qui la tua didascalia..." disabled={isProcessing} />
            </div>
            <div>
                <label htmlFor="scheduledAt" className="mb-2 block font-semibold text-gray-300">Data e Ora di Pubblicazione</label>
                <input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500"
                    disabled={isProcessing} />
            </div>
            <button type="submit"
                className="w-full rounded-md bg-green-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
                disabled={isProcessing || !selectedAccountId}>
                {isProcessing ? 'Elaborazione...' : 'Programma Video'}
            </button>
        </form>

        {message && (<p className="mt-6 text-center font-semibold text-gray-300">{message}</p>)}
        
        <div className="mt-8 border-t border-gray-700 pt-6 text-center">
             <a href="/" className="text-blue-400 hover:text-blue-500">Collega un altro account Instagram</a>
        </div>
      </div>
    </main>
  );
}