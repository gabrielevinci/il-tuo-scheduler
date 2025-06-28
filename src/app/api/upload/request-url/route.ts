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

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Nome del file o tipo mancanti.' }, { status: 400 });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: filename,
      ContentType: contentType,
      ACL: 'public-read', // -> Dice a DigitalOcean di rendere il file leggibile da chiunque
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    return NextResponse.json({ url });

  } catch (error) {
    console.error('Errore durante la creazione del presigned URL:', error);
    return NextResponse.json({ error: 'Impossibile generare l-URL di upload.' }, { status: 500 });
  }
}