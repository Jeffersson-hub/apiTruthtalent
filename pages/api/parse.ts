import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import { extractCVData } from '../../utils/extractCVData';
import { Candidat } from '../../types/candidats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { files } = req.body; // tableau de paths Supabase
  const results: { path: string; extracted: Candidat }[] = [];

  for (const path of files) {
    // 1. Télécharger le fichier
    const { data, error: downloadError } = await supabase
      .storage
      .from('truthtalent')
      .download(path);
    if (downloadError) {
      return res.status(500).json({ error: downloadError.message });
    }

    // 2. Extraire le texte
    const buffer = Buffer.from(await data.arrayBuffer());
    const extracted: Candidat = await extractCVData(buffer, path);

    // 3. Insérer dans la base de données
    const { error: dbError } = await supabase
      .from('candidats')
      .insert<Candidat>([extracted])
      .select(); // Ajoute `.select()` pour retourner les données insérées (optionnel)

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    results.push({ path, extracted });
  }

  res.status(200).json({ message: 'CV analysés et insérés', results });
}
