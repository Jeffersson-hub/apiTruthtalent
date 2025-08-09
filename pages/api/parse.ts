import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Candidat } from '../../utils/extractCVData';
import Cors from 'cors';

type ParseResult = {
  file: string;
  status: 'ok' | 'failed';
  data?: any;
  reason?: string;
};

// Initialiser le middleware CORS
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: 'https://truthtalent.online', // Assurez-vous que cela correspond à votre origine
});

// Helper method to wait for a middleware to execute before continuing
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

async function extractCVData(buffer: Buffer) {
  const text = (await pdfParse(buffer).catch(() => null))?.text ?? (await mammoth.extractRawText({ buffer }).then(r => r.value).catch(() => '')) ?? '';
  const emailMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const telMatch = text.match(/(\+?\d[\d\s\-\(\)]{6,}\d)/);
  const nomMatch = text.match(/Nom\s*:?\s*(\S.+)/i);
  const competences = Array.from(new Set((text.match(/(skills|compétences|compétence)\s*[:\-\n]*([\s\S]{0,200})/i)?.[2]?.split(/[,;\n•·\-]/).map(s => s.trim()).filter(Boolean) || [])));
  return {
    nom: nomMatch?.[1]?.trim() ?? null,
    email: emailMatch?.[0] ?? null,
    telephone: telMatch?.[0] ?? null,
    competences,
    cv_text: text
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Exécuter le middleware CORS
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

    const resultsPromise = files.map(async (file: { name: any; }) => {
      const path = `${FOLDER}/${file.name}`;
      try {
        const { data: fileStream, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
        if (downloadError || !fileStream) {
          throw new Error(downloadError?.message || 'Erreur téléchargement');
        }

        const arrayBuffer = await fileStream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extracted: Candidat = {
          nom: null,
          prenom: null,
          email: null,
          telephone: null,
          adresse: null,
          linkedin: null,
          github: null,
          autres_liens: null,
          experiences: null,
          formations: null,
          langues: null,
          certifications: null,
          resume: null,
          objectif: null,
          fichier_cv_url: path,
          date_analyse: new Date().toISOString(),
          competences: []
        };

        const { error: upsertError } = await supabase
          .from('candidat')
          .upsert(extracted, { onConflict: 'email' });

        if (upsertError) {
          throw upsertError;
        }

        return { file: file.name, status: 'ok', data: extracted } as ParseResult;
      } catch (err: any) {
        console.error(`Erreur fichier ${file.name}:`, err);
        return { file: file.name, status: 'failed', reason: err?.message || String(err) } as ParseResult;
      }
    });

    const results = await Promise.all(resultsPromise);

    const emails = results
      .filter((r: ParseResult) => r.status === 'ok' && r.data?.email)
      .map((r: ParseResult) => r.data!.email);

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
s