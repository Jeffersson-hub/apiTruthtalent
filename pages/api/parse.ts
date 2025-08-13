import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Cors from 'cors';
import { extractCVData, Candidat } from '../../utils/extractCVData';

const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: 'https://truthtalent.online',
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

          const candidatId = candidatData[0].id;

          // Insérer les expériences dans la table "jobs"
          if (extractedData.experiences && extractedData.experiences.length > 0) {
            const jobsInserts = extractedData.experiences.map((experience: {
              [x: string]: any; poste: any; entreprise: any; periode: any; 
}) => ({
              candidat_id: candidatId,
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
              candidat_id: candidatId,
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
