import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import { extractCVData } from '../../utils/extractCVData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // 1️⃣ Liste des fichiers dans le dossier 'cvs'
    const { data: files, error: listError } = await supabase.storage
      .from('truthtalent')
      .list('cvs', { limit: 100 });

    if (listError || !files?.length) {
      console.error('Erreur listing fichiers:', listError);
      return res.status(500).json({ error: 'Erreur lecture des fichiers' });
    }

    // 2️⃣ Traitement en parallèle
    const results = await Promise.all(files.map(async (file) => {
      const path = `cvs/${file.name}`;

      try {
        // Télécharger le fichier binaire
        const { data: fileBuffer, error: downloadError } = await supabase.storage
          .from('truthtalent')
          .download(path);

        if (downloadError || !fileBuffer) {
          throw new Error(downloadError?.message || 'Erreur téléchargement');
        }

        const arrayBuffer = await fileBuffer.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extraction
        const extractedData = await extractCVData(buffer);

        // Upsert dans la table
        const { error: upsertError } = await supabase
          .from('candidats')
          .upsert(
            {
              fichier_cv_url: path,
              ...extractedData,
            },
            { onConflict: 'email' } // évite doublons si même email
          );

        if (upsertError) {
          throw new Error(upsertError.message);
        }

        return { file: file.name, status: 'ok', data: extractedData };
      } catch (err: any) {
        console.error(`Erreur analyse pour ${file.name}:`, err);
        return { file: file.name, status: 'failed', reason: err.message };
      }
    }));

    return res.status(200).json({
  total: results.length,
  candidats: results.filter(r => r.status === 'ok').map(r => r.data)
  } catch (error: any) {
    console.error('Erreur générale:', error);
    res.status(500).json({ error: 'Erreur générale lors de l’analyse' });
  }
}
}
