import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import { extractCVData } from '../../utils/extractCVData';

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

    // 2. Extraire les données du CV
    const candidat = await extractCVData(buffer, fileName);

    // 3. Insérer les données dans Supabase
    const result = await insertCandidatData(candidat);

    if (!result.success) {
      throw new Error(`Insertion failed: ${result.error}`);
    }

    return res.status(200).json({ success: true, candidatId: result.candidatId });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
function insertCandidatData(candidat: Candidat) {
  throw new Error('Function not implemented.');
}

