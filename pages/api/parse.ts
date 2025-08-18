// pages/api/parse.ts
import { createClient } from '@supabase/supabase-js';
import { Candidat, InsertCandidatResult } from '../../utils/types';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialisation unique de supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fonction pour insérer un candidat dans Supabase
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

// Fonction pour traiter le CV et insérer les données
async function processCV(fileBuffer: Buffer, fileName: string): Promise<InsertCandidatResult> {
  try {
    const { extractCVData } = await import('../../utils/extractCVData');
    const candidat = await extractCVData(fileBuffer, fileName);
    return await insertCandidatData(candidat);
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Handler Next.js API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { fileBuffer, fileName } = req.body;
    const buffer = Buffer.from(fileBuffer);
    const result = await processCV(buffer, fileName);
    if (!result.success) {
      throw new Error(result.error?.message);
    }
    res.status(200).json({ success: true, candidatId: result.candidatId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Export des fonctions utiles pour d'autres fichiers si nécessaire
export { insertCandidatData, processCV };
