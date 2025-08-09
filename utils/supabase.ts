// utils/supabase.ts

// import { createClient } from '@supabase/supabase-js';
import { createClient } from '../node_modules/@supabase/supabase-js';
import { extractCVData } from './extractCVData';

const supabaseUrl = process.env.SUPABASE_URL || 'https://venldvzkjzybpffrtkql.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
async function processFilesFromBucket() {
  const BUCKET = 'truthtalent';
  const FOLDER = 'cvs';

  // Lister les fichiers dans le bucket
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 });

  if (listError) {
    console.error('Erreur lors de la liste des fichiers:', listError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('Aucun fichier trouvé dans le bucket.');
    return;
  }

  // Traiter chaque fichier
  for (const file of files) {
    const filePath = `${FOLDER}/${file.name}`;

    // Télécharger le fichier
    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(filePath);

    if (downloadError || !fileData) {
      console.error(`Erreur lors du téléchargement du fichier ${file.name}:`, downloadError);
      continue;
    }

    // Convertir les données du fichier en Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extraire les données du fichier
    const extractedData = await extractCVData(buffer);

    // Insérer les données dans la base de données
    const { error: insertError } = await supabase
      .from('candidats')
      .insert([extractedData]);

    if (insertError) {
      console.error(`Erreur lors de l'insertion des données pour le fichier ${file.name}:`, insertError);
    } else {
      console.log(`Données insérées avec succès pour le fichier ${file.name}.`);
    }
  }
}

processFilesFromBucket();