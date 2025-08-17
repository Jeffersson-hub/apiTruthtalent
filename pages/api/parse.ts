// pages/api/parse.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { extractCVData } from '../../utils/extractCVData';
import { insertCandidatData } from '../../utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileBuffer, fileName } = req.body;
    const buffer = Buffer.from(fileBuffer);
    const candidat = await extractCVData(buffer, fileName);
    const result = await insertCandidatData(candidat);

    if (!result.success) {
      throw new Error(result.error?.message);
    }

    res.status(200).json({ success: true, candidatId: result.candidatId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
