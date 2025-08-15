import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Interface pour les données d'un candidat
interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences: string[] | null;
  experiences: Array<{
    poste: string;
    entreprise: string | null;
    periode: string | null;
    description: string | null;
  }> | null;
  linkedin: string | null;
  formations: Array<{ raw: string }> | null;
  langues: Array<{
    langue: string;
    niveau: string;
  }> | null;
}

// Configuration CORS
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  origin: ['https://truthtalent.online', 'https://apitruthtalent.vercel.app'],
});

// Middleware pour gérer le CORS
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

// Initialisation du client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Fonction pour extraire les données d'un PDF
async function extractFromPDF(url: string): Promise<Partial<Candidat>> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const pdfData = await pdfParse(Buffer.from(arrayBuffer));
    const text = pdfData.text;

    // Exemple d'extraction basique (à adapter selon vos besoins)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+/);
    const email = emailMatch ? emailMatch[0] : null;

    return {
      nom: text.match(/Nom:\s*(.*)/i)?.[1] || null,
      prenom: text.match(/Prénom:\s*(.*)/i)?.[1] || null,
      email: email,
      telephone: text.match(/Tél:\s*([\d\s\-]+)/)?.[1] || null,
      competences: text.match(/Compétences:([\s\S]*?)(?=\n|$)/i)?.[1]?.split(',') || null,
    };
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    return {};
  }
}

// Fonction pour extraire les données d'un DOCX
async function extractFromDOCX(url: string): Promise<Partial<Candidat>> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const { value: docxData } = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
    const text = docxData;

    // Exemple d'extraction basique (à adapter selon vos besoins)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+/);
    const email = emailMatch ? emailMatch[0] : null;

    return {
      nom: text.match(/Nom:\s*(.*)/i)?.[1] || null,
      prenom: text.match(/Prénom:\s*(.*)/i)?.[1] || null,
      email: email,
      telephone: text.match(/Tél:\s*([\d\s\-]+)/)?.[1] || null,
      competences: text.match(/Compétences:([\s\S]*?)(?=\n|$)/i)?.[1]?.split(',') || null,
    };
  } catch (error) {
    console.error('Erreur extraction DOCX:', error);
    return {};
  }
}

// Fonction pour préparer les données avant insertion
function prepareCandidatForInsertion(candidat: Partial<Candidat>): Candidat {
  return {
    nom: candidat.nom || 'Inconnu',
    prenom: candidat.prenom || 'Inconnu',
    email: candidat.email || 'email@inconnu.com',
    telephone: candidat.telephone || null,
    adresse: candidat.adresse || null,
    competences: candidat.competences || [],
    experiences: candidat.experiences || [],
    linkedin: candidat.linkedin || null,
    formations: candidat.formations || [],
    langues: candidat.langues || [],
  };
}

// Endpoint principal
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  console.log('--- Début analyse ---');

  try {
    const BUCKET = 'truthtalent';
    const FOLDER = 'cvs';

    // 1. Lister les fichiers dans le bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER);

    if (listError) {
      console.error('Erreur liste fichiers:', listError);
      return res.status(500).json({ error: `Impossible de lister les fichiers: ${listError.message}` });
    }

    if (!files || files.length === 0) {
      return res.status(200).json({ total_files: 0, results: [], candidats: [] });
    }

    console.log('Fichiers trouvés:', files);

    // 2. Traiter chaque fichier
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const path = `${FOLDER}/${file.name}`;
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const publicUrl = urlData.publicUrl;

          // Extraire les données selon le type de fichier
          let cvData: Partial<Candidat> = {};
          if (file.name.endsWith('.pdf')) {
            cvData = await extractFromPDF(urlData.publicUrl);
          } else if (file.name.endsWith('.docx')) {
            cvData = await extractFromDOCX(urlData.publicUrl);
          } else {
            throw new Error('Format de fichier non supporté');
          }

          // Préparer les données pour l'insertion
          const candidat: Candidat = prepareCandidatForInsertion(cvData);

          // 3. Insérer dans la table candidats
          const { data: insertedCandidat, error: insertError } = await supabase
            .from('candidats')
            .insert([{
              nom: candidat.nom,
              prenom: candidat.prenom,
              email: candidat.email,
              telephone: candidat.telephone,
              adresse: candidat.adresse,
              competences: candidat.competences,
              experiences: candidat.experiences,
              linkedin: candidat.linkedin,
              formations: candidat.formations,
              langues: candidat.langues,
              fichier_cv_url: urlData.publicUrl,
            }])
            .select();

          if (insertError) {
            throw new Error(`Erreur insertion: ${insertError.message} (Code: ${insertError.code})`);
          }

          return { file: file.name, status: 'success', candidat: insertedCandidat };
        } catch (fileError: unknown) {
          console.error(`Erreur pour ${file.name}:`, fileError);
          return {
            file: file.name,
            status: 'failed',
            reason: fileError instanceof Error ? fileError.message : 'Erreur inconnue',
          };
        }
      })
    );

    // 4. Retourner le résultat
    res.setHeader('Access-Control-Allow-Origin', 'https://truthtalent.online');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({
      total_files: files.length,
      results,
      candidats: results.filter(r => r.status === 'success').map(r => r.candidat),
    });
  } catch (error: unknown) {
    console.error('Erreur générale:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}
