// utils/parse.ts
// 
import { supabase } from './supabaseClient';
import { extractCVData } from './extractCVData';
import { Buffer } from 'buffer';

export async function parseAllCVs() {
  // 1️⃣ Lister les fichiers dans le bucket
  const { data: files, error: listError } = await supabase.storage
    .from('truthtalent')
    .list('cvs');

  if (listError) {
    console.error('Erreur liste fichiers:', listError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('Aucun fichier trouvé dans le bucket.');
    return;
  }

  // Boucle sur chaque fichier
  for (const file of files) {
    try {
      // Télécharger le fichier
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('truthtalent')
        .download(`cvs/${file.name}`);

      if (downloadError || !fileBlob) {
        console.error('Erreur téléchargement fichier:', file.name, downloadError);
        continue;
      }

      // Convertir Blob -> Buffer
      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // Extraire les données du CV
      const candidatData = await extractCVData(buffer, file.name);

      console.log('Données extraites pour', file.name, candidatData);

      // Insérer dans la table candidats
      const { data: inserted, error: insertError } = await supabase
        .from('candidats')
        .insert([candidatData]);

      if (insertError) {
        console.error('Erreur insertion candidat:', insertError);
      } else {
        console.log('Candidat inséré:', inserted);
      }

    } catch (err) {
      console.error('Erreur traitement fichier:', file.name, err);
    }
  }
}

// Si on exécute le fichier directement
if (require.main === module) {
  parseAllCVs()
    .then(() => console.log('Analyse terminée'))
    .catch(err => console.error('Erreur globale:', err));
}
