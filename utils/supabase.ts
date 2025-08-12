// utils/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { extractCVData, candidats } from './extractCVData';

const supabaseUrl = process.env.SUPABASE_URL || 'https://cpdokjsyxmohubgvxift.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZG9ranN5eG1vaHViZ3Z4aWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzI1MzQsImV4cCI6MjA2ODIwODUzNH0.R_E0t1WLWby-ZeqohAL8HUumto5uYPTJacnqij-JVaM';
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

    try {
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
          adresse: extractedData.adresse,
          competences: extractedData.competences,
          experiences: extractedData.experiences,
          linkedin: extractedData.linkedin,
          formations: extractedData.formations,
          langues: extractedData.langues,
        }]);

      if (insertError) {
        console.error(`Erreur lors de l'insertion des données pour le fichier ${file.name}:`, insertError);
      } else {
        console.log(`Données insérées avec succès pour le fichier ${file.name}.`);
      }

      // Insérer les données dans la table "jobs"
      if (extractedData.experiences && extractedData.experiences.length > 0) {
        const jobsInserts = extractedData.experiences.map((experience: { title: any; }) => ({
          title: experience.title,
          domaine: extractedData.domaine,
          description: extractedData.description,
          location: extractedData.location,
          salary: extractedData.salary,
          user_id: "User ID",
        }));

        const { error: InsertError } = await supabase
          .from('jobs')
          .insert(jobsInserts);

        if (InsertError) {
          console.error(`Erreur lors de l'insertion des expériences pour le fichier ${file.name}:`, InsertError);
        }
      }

      // Insérer les données dans la table "skills"
      if (extractedData.competences && extractedData.competences.length > 0) {
        const skillsInserts = extractedData.competences.map(competence => ({
          candidat_id: "Default Candidate ID",
          nom: competence,
        }));

        const { error: skillsInsertError } = await supabase
          .from('skills')
          .insert(skillsInserts);

        if (skillsInsertError) {
          console.error(`Erreur lors de l'insertion des compétences pour le fichier ${file.name}:`, skillsInsertError);
        }
      }
    } catch (error) {
      console.error(`Erreur lors du traitement du fichier ${file.name}:`, error);
    }
  }
}

processFilesFromBucket();
