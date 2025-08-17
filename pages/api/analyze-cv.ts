import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import { extractCVData } from '../../utils/extractCVData';
import { Candidat, InsertCandidatResult } from '../../utils/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, bucketName } = req.body;
    if (!fileName || !bucketName) {
      return res.status(400).json({ error: 'fileName and bucketName are required' });
    }

    // 1. Télécharger le fichier
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 2. Extraire les données
    const candidat = await extractCVData(buffer, fileName);

    // 3. Insérer les données
    const result: InsertCandidatResult = await insertCandidatData(candidat);

    if (!result.success) {
      throw new Error(`Insertion failed: ${result.error}`);
    }

    return res.status(200).json({ success: true, candidatId: result.candidatId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', errorMessage);
    return res.status(500).json({ error: errorMessage });
  }
}
// pages/api/analyze-cv.ts
async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    const { data: insertedCandidat, error } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();

    if (error) throw error;

    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}


