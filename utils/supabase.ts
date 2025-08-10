import { createClient } from '@supabase/supabase-js';
import { extractCVData, candidat } from './extractCVData';

const supabaseUrl = process.env.SUPABASE_URL || 'https://venldvzkjzybpffrtkql.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbmxkdnpranp5YnBmZnJ0a3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzE1MDUsImV4cCI6MjA2OTU0NzUwNX0.-sfbWvmpnU0Ivn0AQ8cRy-hzGZDPFImTxo8XH0jArxs';
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

    // Insérer les données dans la table "candidats"
    const { error: insertError } = await supabase
      .from('candidats')
      .insert([{
        nom: extractedData.nom,
        prenom: extractedData.prenom,
        email: extractedData.email,
        telephone: extractedData.telephone,
        competences: extractedData.competences,
        experiences: extractedData.experiences,
        formations: extractedData.formations,
        langues: extractedData.langues,
        linkedin: extractedData.linkedin,
      }]);

    if (insertError) {
      console.error(`Erreur lors de l'insertion des données pour le fichier ${file.name}:`, insertError);
    } else {
      console.log(`Données insérées avec succès pour le fichier ${file.name}.`);
    }

    // Insérer les données dans la table "jobs"
    if (extractedData.experiences && extractedData.experiences.length > 0) {
      const jobsInserts = extractedData.experiences.map(experience => ({
        name: experience.poste, // Assurez-vous que le champ est correct
        domain: "Default Domain", // Remplacez par une valeur appropriée
        user_id: "Default User ID", // Remplacez par une valeur appropriée
      }));

      const { error: jobsInsertError } = await supabase
        .from('jobs')
        .insert(jobsInserts);

      if (jobsInsertError) {
        console.error(`Erreur lors de l'insertion des expériences pour le fichier ${file.name}:`, jobsInsertError);
      }
    }

    // Insérer les données dans la table "skills"
    if (extractedData.competences && extractedData.competences.length > 0) {
      const skillsInserts = extractedData.competences.map(competence => ({
        candidat_id: "Default Candidate ID", // Remplacez par une valeur appropriée
        nom: competence,
      }));

      const { error: skillsInsertError } = await supabase
        .from('skills')
        .insert(skillsInserts);

      if (skillsInsertError) {
        console.error(`Erreur lors de l'insertion des compétences pour le fichier ${file.name}:`, skillsInsertError);
      }
    }
  }
}

processFilesFromBucket();
