// src/app/dashboard/page.tsx -> VERSIONE MULTI-ACCOUNT

'use client';

import { useState, useEffect } from 'react';

interface InstagramAccount {
  id: number;
  instagram_user_id: string;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  // ... (gli altri stati per file, caption, etc. rimangono gli stessi)
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');


  useEffect(() => {
    // Carica gli account collegati quando il componente viene montato
    async function fetchAccounts() {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    }
    fetchAccounts();
  }, []);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Aggiungiamo un controllo per l'account selezionato
    if (!file || !caption || !scheduledAt || !selectedAccountId) {
      setMessage('Per favore, seleziona un account e compila tutti i campi.');
      return;
    }
    // ... (il resto della logica di handleSubmit rimane quasi identico)
    // La chiamata a /api/schedule dovrà essere aggiornata
  };

  // ... (Il resto del JSX va qui, con l'aggiunta del selettore account)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold">Programma un Nuovo Video</h1>
        
        {/* --- NUOVO SELETTORE ACCOUNT --- */}
        <div className="mb-6">
            <label htmlFor="account-select" className="mb-2 block font-semibold text-gray-300">
                Scegli un Account
            </label>
            <select 
                id="account-select"
                value={selectedAccountId ?? ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:border-blue-500 focus:ring-blue-500"
            >
                <option value="" disabled>Seleziona...</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        Account ID: {acc.instagram_user_id}
                    </option>
                ))}
            </select>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (tutti gli altri input del form: file, caption, datetime) ... */}
        </form>

        {/* Aggiungi un pulsante per collegare altri account */}
        <div className="mt-8 border-t border-gray-700 pt-6 text-center">
             <a href="/" className="text-blue-400 hover:text-blue-500">Collega un altro account Instagram</a>
        </div>
      </div>
    </main>
  );
}