// /cv-api/pages/api/parse.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { extractCVData } from '../../utils/extractCVData';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL manquante' });
    }

    // Extraction des données du CV
    const data = await extractCVData(url);

    // Sauvegarde dans Supabase table "candidats"
    const { error } = await supabase.from('candidats').insert([{ file_url: url, ...data }]);
    if (error) {
      console.error('Erreur insertion en base:', error);
      return res.status(500).json({ error: 'Erreur sauvegarde données' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Erreur analyse:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
}
