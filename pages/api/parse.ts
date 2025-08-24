// pages/api/parse.ts
// 
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import { extractCVData } from '../../utils/extractCVData';
import { Candidat } from '../../types/candidats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { files } = req.body; // tableau de paths Supabase
  
  const results: { path: string; extracted?: Candidat; error?: string }[] = [];
for (const path of files) {
    try {
        const { data, error: downloadError } = await supabase.storage.from('truthtalent').download(path);
        if (downloadError) throw new Error(downloadError.message);

        const buffer = Buffer.from(await data.arrayBuffer());
        console.log('Fichier en cours :', path); // Log avant extraction
        const extracted = await extractCVData(buffer, path);
        console.log('Extraction CV :', extracted); // Log après extraction

        const { error: dbError } = await supabase.from('candidats').insert([extracted]).select();
        if (dbError) throw new Error(dbError.message);

        results.push({ path, extracted });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur pour', path, ':', errorMessage);
    results.push({ path, error: errorMessage });
    }
}

  res.status(200).json({ message: 'CV analysés et insérés', results });
}
