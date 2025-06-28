// src/app/api/upload/request-url/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configura il client S3 per puntare a DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT!,
  region: process.env.DO_SPACES_REGION!,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
});

// Questa funzione gestisce le richieste POST al nostro endpoint
export async function POST(request: NextRequest) {
  try {
    // Estraiamo il nome e il tipo del file dalla richiesta del frontend
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Nome del file o tipo mancanti.' }, { status: 400 });
    }

    // Creiamo un comando per dire a S3 cosa vogliamo fare
    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: filename, // Il nome che il file avrà su DigitalOcean
      ContentType: contentType,
    });

    // Generiamo l'URL "presigned" che è valido per 10 minuti
    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    // Restituiamo l'URL al frontend
    return NextResponse.json({ url });

  } catch (error) {
    console.error('Errore durante la creazione del presigned URL:', error);
    return NextResponse.json({ error: 'Impossibile generare l-URL di upload.' }, { status: 500 });
  }
}