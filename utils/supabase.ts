// utils/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { extractCVData } from './extractCVData';
import { Candidat } from './extractCVData';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!);


  
async function processFilesFromBucket() {
  const BUCKET = 'truthtalent';
  const FOLDER = 'cvs';

  // Lister les fichiers dans le bucket
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 });

  if (listError) {
    console.error('Erreur lors de la liste des fichiers:', listError, 'Files:', files);
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
        const jobsInserts = extractedData.experiences.map((experience: {
          [x: string]: any; poste: string | null; entreprise: string | null; periode: string | null; 
      }) => ({
        poste: experience.poste,
        description: experience.description,
        location: experience.location,
        entreprise: experience.entreprise,
        salary: experience.salary,
        periode: experience.periode,
        domaine: experience.domaine,
        id: "user id", // Assure-toi que candidatId est défini
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
        const skillsInserts = extractedData.competences.map((competence: any) => ({
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
