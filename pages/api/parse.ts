// pages/api/parse.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { extractCVData } from '../../utils/extractCVData';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';
import { insertCandidatData } from '@/utils/supabase';

dotenv.config();

interface FileData {
  url: string;
  name: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Récupérer les données envoyées par WordPress
    const { files } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ success: false, error: 'Invalid files data' });
    }

    // 3. Traiter chaque fichier
    for (const file of files as FileData[]) {
      console.log(`Processing file: ${file.name} (URL: ${file.url})`);

      // 4. Télécharger le fichier depuis l'URL
      const response = await fetch(file.url);
      if (!response.ok) {
        console.error(`Failed to download ${file.name}: HTTP ${response.status}`);
        continue;
      }

      const fileBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(fileBuffer);

      // 5. Extraire les données du CV
      const candidat = await extractCVData(buffer, file.name);
      console.log(`Extracted data for ${file.name}:`, candidat);

      // 6. Insérer en base de données
      const result = await insertCandidatData(candidat);
      if (!result.success) {
        console.error(`Failed to insert ${file.name}:`, result.error);
      } else {
        console.log(`Successfully inserted ${file.name} with ID: ${result.candidatId}`);
      }
    }

    // 7. Répondre avec succès
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
