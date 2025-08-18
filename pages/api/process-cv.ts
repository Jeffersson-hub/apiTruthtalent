// api/process-cv.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processCV } from '../../utils/parse'; // Import des fonctions exportées

// Initialisation du client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { fileName, bucketName } = req.body;
    if (!fileName || !bucketName) {
      return res.status(400).json({ error: 'fileName and bucketName are required' });
    }

    // 1. Télécharger le fichier depuis Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 2. Traiter le fichier
    const result = await processCV(buffer, fileName);

    if (!result.success) {
      throw result.error;
    }

    return res.status(200).json({ success: true, candidatId: result.candidatId });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
