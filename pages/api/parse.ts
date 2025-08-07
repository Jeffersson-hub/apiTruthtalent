import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../api/lib/supabase';
import { extractCVData } from '../../utils/extractCVData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // 🔍 Liste des fichiers dans le dossier 'cvs'
    const { data: files, error: listError } = await supabase.storage.from('truthtalent').list('cvs', {
      limit: 100,
    });

    if (listError || !files) {
      console.error('Erreur listing fichiers:', listError);
      return res.status(500).json({ error: 'Erreur lecture des fichiers' });
    }

    const results = [];

    for (const file of files) {
      const path = `cvs/${file.name}`;
      const { data: urlData } = supabase.storage.from('truthtalent').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Analyse du fichier
      try {
        const data = await extractCVData(publicUrl);

        const { error: insertError } = await supabase.from('candidats').insert([{
          fichier_cv_url: publicUrl,
          ...data,
        }]);

        if (insertError) {
          console.error(`Erreur insertion pour ${file.name}:`, insertError);
          results.push({ file: file.name, status: 'failed', reason: insertError.message });
        } else {
          results.push({ file: file.name, status: 'ok', data });
        }
      } catch (e: any) {
        console.error(`Erreur analyse pour ${file.name}:`, e);
        results.push({ file: file.name, status: 'failed', reason: e.message });
      }
    }

    return res.status(200).json({ results });
  } catch (error: any) {
    console.error('Erreur générale:', error);
    res.status(500).json({ error: 'Erreur générale lors de l’analyse' });
  }
}
