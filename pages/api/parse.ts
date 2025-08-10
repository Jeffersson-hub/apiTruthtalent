import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Cors from 'cors';
import { candidat } from '../../utils/extractCVData';

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

async function extractCVData(buffer: Buffer): Promise<candidat> {
  const text = (await pdfParse(buffer).catch(() => null))?.text ?? (await mammoth.extractRawText({ buffer }).then(r => r.value).catch(() => '')) ?? '';
  const emailMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const telMatch = text.match(/(\+?\d[\d\s\-\(\)]{6,}\d)/);
  const nomMatch = text.match(/nom\s*:?\s*(\S.+)/i);
  const competences = Array.from(new Set((text.match(/(skills|competences|compétences)\s*[:\-\n]*([\s\S]{0,200})/i)?.[2]?.split(/[,;\n•·\-]/).map(s => s.trim()).filter(Boolean) || [])));
  const domainMatch = text.match(/domain\s*:?\s*(\S.+)/i);

  return {
    user_id: null, // Assurez-vous de définir une valeur appropriée
    domain: null, // Assurez-vous de définir une valeur appropriée
    metier: null, // Assurez-vous de définir une valeur appropriée
    nom: nomMatch?.[1]?.trim() ?? null,
    prenom: null, // Assurez-vous de définir une valeur appropriée
    email: emailMatch?.[0] ?? null,
    telephone: telMatch?.[0] ?? null,
    adresse: null, // Assurez-vous de définir une valeur appropriée
    linkedin: null, // Assurez-vous de définir une valeur appropriée
    github: null, // Assurez-vous de définir une valeur appropriée
    autres_liens: null, // Assurez-vous de définir une valeur appropriée
    competences: competences.length > 0 ? competences : null,
    experiences: [], // Assurez-vous de définir une valeur appropriée
    formations: null, // Assurez-vous de définir une valeur appropriée
    langues: null, // Assurez-vous de définir une valeur appropriée
    certifications: null, // Assurez-vous de définir une valeur appropriée
    resume: null, // Assurez-vous de définir une valeur appropriée
    objectif: null, // Assurez-vous de définir une valeur appropriée
    fichier_cv_url: null, // Assurez-vous de définir une valeur appropriée
    date_analyse: new Date().toISOString() // Assurez-vous de définir une valeur appropriée
    // cv_text: text || null
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const BUCKET = 'truthtalent';
    const FOLDER = 'cvs';

    const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 });

    if (listError) {
      console.error('Erreur listing:', listError);
      return res.status(500).json({ error: 'Impossible de lister les fichiers' });
    }

    if (!files || files.length === 0) {
      return res.status(200).json({ total: 0, results: [] });
    }

    const resultsPromise = files.map(async (file: { name: string }) => {
      const path = `${FOLDER}/${file.name}`;

      try {
        const { data: fileStream, error: downloadError } = await supabase.storage.from(BUCKET).download(path);

        if (downloadError || !fileStream) {
          throw new Error(downloadError?.message || 'Erreur téléchargement');
        }

        const arrayBuffer = await fileStream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const extractedData = await extractCVData(buffer);

        // Insérer les données dans la table "candidats"
        const { data: candidatData, error: candidatInsertError } = await supabase
          .from('candidats')
          .insert([{
            nom: extractedData.nom,
            email: extractedData.email,
            telephone: extractedData.telephone,
            competences: extractedData.competences,
            cv_text: extractedData.cv_text
          }])
          .select();

        if (candidatInsertError) {
          throw candidatInsertError;
        }

        const candidatId = candidatData[0].id;

        // Insérer les données dans la table "jobs"
        if (extractedData.experiences && extractedData.experiences.length > 0) {
          const jobsInserts = extractedData.experiences.map(experience => ({
            candidat_id: candidatId,
            poste: experience.poste,
            entreprise: experience.entreprise
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
            candidat_id: candidatId,
            nom: competence
          }));

          const { error: skillsInsertError } = await supabase
            .from('skills')
            .insert(skillsInserts);

          if (skillsInsertError) {
            console.error(`Erreur lors de l'insertion des compétences pour le fichier ${file.name}:`, skillsInsertError);
          }
        }

        return { file: file.name, status: 'ok', data: extractedData };
      } catch (err: any) {
        console.error(`Erreur fichier ${file.name}:`, err);
        return { file: file.name, status: 'failed', reason: err?.message || String(err) };
      }
    });

    const results = await Promise.all(resultsPromise);

    const emails = results
      .filter((r) => r.status === 'ok' && r.data?.email)
      .map((r) => r.data!.email);

    let candidatsFromDb: any[] = [];

    if (emails.length) {
      const { data: dbRows, error: fetchError } = await supabase
        .from('candidats')
        .select('*')
        .in('email', emails)
        .order('date_analyse', { ascending: false });

      if (!fetchError && dbRows) candidatsFromDb = dbRows;
    }

    return res.status(200).json({
      total_files: files.length,
      results,
      candidats: candidatsFromDb
    });
  } catch (error: any) {
    console.error('Erreur générale parse:', error);
    return res.status(500).json({ error: error?.message || 'Erreur serveur' });
  }
}
