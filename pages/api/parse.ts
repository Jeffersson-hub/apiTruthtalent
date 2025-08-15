import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Cors from 'cors';
import { extractCVData, Candidat } from '../../utils/extractCVData';

const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: ['https://truthtalent.online', 'https://apitruthtalent.vercel.app'],
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  console.log('--- Début analyse ---')

  try {
    const BUCKET = 'truthtalent';
    const FOLDER = 'cvs';

    // Lister les fichiers dans le bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, { limit: 1000 });

    if (listError) {
      console.error('Erreur lors de la liste des fichiers:', listError);
      return res.status(500).json({ error: 'Impossible de lister les fichiers' });
    }

    if (!files || files.length === 0) {
      return res.status(200).json({ total_files: 0, results: [] });
    }
     console.log('Fichiers trouvés:', files)

    // Traiter chaque fichier
    const results = await Promise.all(
      files.map(async (file) => {
        const path = `${FOLDER}/${file.name}`;
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(BUCKET)
            .download(path);

          if (downloadError || !fileData) {
            throw new Error(downloadError?.message || 'Erreur lors du téléchargement');
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const extractedData = await extractCVData(buffer);

           console.log('Fichiers traités:', files)


          // Dans parse.ts, après avoir extrait les données du CV
const { data: existingCandidat, error: fetchError } = await supabase
  .from('candidats')
  .select('id')
  .eq('email', extractedData.email)
  .maybeSingle(); // Utilise maybeSingle() pour éviter les erreurs si aucun résultat

  console.log('Données extraites:', extractedData)

let candidat: string;

if (existingCandidat) {
  // Mettre à jour le candidat existant
  const { error: updateError } = await supabase
    .from('candidats')
    .update({
      nom: extractedData.nom,
      prenom: extractedData.prenom,
      telephone: extractedData.telephone,
      competences: extractedData.competences || [],
      langues: extractedData.langues || [],
      formations: extractedData.formations,
      // ... autres champs à mettre à jour
    })
    .eq('id', existingCandidat.id);

  if (updateError) {
    console.error(`Erreur mise à jour candidat ${extractedData.email}:`, updateError);
    throw updateError;
  }
  candidat = existingCandidat.id;
  console.log(`Candidat mis à jour: ${candidat}`);
} else {
  // Insérer un nouveau candidat
  const { data: newCandidat, error: insertError } = await supabase
    .from('candidats')
    .insert([{
      nom: extractedData.nom,
      prenom: extractedData.prenom,
      email: extractedData.email,
      telephone: extractedData.telephone,
      competences: extractedData.competences,
      langues: extractedData.langues,
      formations: extractedData.formations,
      // ... autres champs
    }])
    .select('id')
    .single();

  if (insertError) {
    console.error(`Erreur insertion candidat ${extractedData.email}:`, insertError);
    throw insertError;
  }
  candidat = newCandidat.id;
  console.log(`Nouveau candidat créé: ${candidat}`);
}

// Insérer les expériences dans la table `experiences`
if (extractedData.experiences && extractedData.experiences.length > 0) {
  // Supprimer les expériences existantes pour éviter les doublons
  const { error: deleteError } = await supabase
    .from('experiences')
    .delete()
    .eq('candidat_id', candidat);

  if (deleteError) {
    console.error(`Erreur suppression expériences existantes:`, deleteError);
  }

  // Insérer les nouvelles expériences
  const experiencesInserts = extractedData.experiences.map((exp: { poste: any; entreprise: any; periode: any; description: any; }) => ({
    candidat_id: candidat,
    poste: exp.poste,
    entreprise: exp.entreprise,
    periode: exp.periode,
    description: exp.description || null,
  }));

  const { error: expError } = await supabase
    .from('experiences')
    .insert(experiencesInserts);

  if (expError) {
    console.error(`Erreur insertion expériences:`, expError);
  }
}

          // Insérer les données dans la table "candidats"
          const { data: candidatData, error: candidatInsertError } = await supabase
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
              certifications: extractedData.certifications,
              resume: extractedData.resume,
              objectif: extractedData.objectif,
              fichier_cv_url: path,
              date_analyse: new Date().toISOString(),
            }])
            .select();

          if (candidatInsertError) {
            throw candidatInsertError;
          }

          const candidats = candidatData[0].id;

          // Insérer les expériences dans la table "jobs"
          if (extractedData.experiences && extractedData.experiences.length > 0) {
            const jobsInserts = extractedData.experiences.map((experience: {
              [x: string]: any; poste: any; entreprise: any; periode: any; 
}) => ({
              candidat_id: candidat,
              description: experience.description,
              location: experience.location,
              salary: experience.salary,
              poste: experience.poste,
              entreprise: experience.entreprise,
              periode: experience.periode,
              domaine: experience.domaine,
            }));

            const { error: jobsInsertError } = await supabase
              .from('jobs')
              .insert(jobsInserts);

            if (jobsInsertError) {
              console.error(`Erreur lors de l'insertion des expériences pour le fichier ${file.name}:`, jobsInsertError);
            }
          }

          // Insérer les compétences dans la table "skills"
          if (extractedData.competences && extractedData.competences.length > 0) {
            const skillsInserts = extractedData.competences.map((competence: any) => ({
              candidat_id: candidat,
              nom: competence,
            }));

            const { error: skillsInsertError } = await supabase
              .from('skills')
              .insert(skillsInserts);

            if (skillsInsertError) {
              console.error(`Erreur lors de l'insertion des compétences pour le fichier ${file.name}:`, skillsInsertError);
            }
          }

          return { file: file.name, status: 'ok', data: extractedData };
        } catch (err) {
          console.error(`Erreur lors du traitement du fichier ${file.name}:`, err);
          return { file: file.name, status: 'failed', reason: err instanceof Error ? err.message : String(err) };
        }
      })
    );

    // Récupérer les candidats depuis la base de données
    const emails = results
      .filter((r) => r.status === 'ok' && r.data?.email)
      .map((r) => r.data!.email);

    let candidatsFromDb: any[] = [];
    if (emails.length > 0) {
      const { data: dbRows, error: fetchError } = await supabase
        .from('candidats')
        .select('*')
        .in('email', emails)
        .order('date_analyse', { ascending: false });

      if (!fetchError && dbRows) {
        candidatsFromDb = dbRows;
      }
    }

    res.setHeader('Access-Control-Allow-Origin', 'https://truthtalent.online');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({
      total_files: files.length,
      results,
      candidats: candidatsFromDb,
    });
  } catch (error) {
    console.error('Erreur générale:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
}
