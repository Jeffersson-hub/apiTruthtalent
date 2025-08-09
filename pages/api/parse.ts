// pages/api/parse.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase'; // ton client supabase
// import { extractCVData } from '../../utils/extractCVData';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Candidat } from '../../utils/extractCVData';

type ParseResult = {
  file: string;
  status: 'ok' | 'failed';
  data?: any;
  reason?: string;
};

  /**
   * Fonction basique d'extraction — tu peux l'améliorer (regexs, NLP, heuristiques)
   * Ici on extrait nom/email/tel + raw text + compétences simple.
   */
  async function extractCVData(buffer: Buffer) {
    const text = (await pdfParse(buffer).catch(()=>null))?.text ?? (await mammoth.extractRawText({ buffer }).then(r=>r.value).catch(()=>'')) ?? '';
    const emailMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    const telMatch = text.match(/(\+?\d[\d\s\-\(\)]{6,}\d)/);
    // Nom heuristique simple (ligne "Nom: X")
    const nomMatch = text.match(/Nom\s*:?\s*(\S.+)/i);
    const competences = Array.from(new Set((text.match(/(skills|compétences|compétence)\s*[:\-\n]*([\s\S]{0,200})/i)?.[2]?.split(/[,;\n•·\-]/).map(s=>s.trim()).filter(Boolean) || [])));
    return {
      nom: nomMatch?.[1]?.trim() ?? null,
      email: emailMatch?.[0] ?? null,
      telephone: telMatch?.[0] ?? null,
      competences,
      cv_text: text
    };
  }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // 1) Lister les fichiers dans dossier 'cvs' du bucket (adapter le nom du bucket si nécessaire)
    const BUCKET = 'truthtalent'; // si ton bucket a un autre nom, change ici
    const FOLDER = 'cvs';
    const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 });

    if (listError) {
      console.error('Erreur listing:', listError);
      return res.status(500).json({ error: 'Impossible de lister les fichiers' });
    }
    if (!files || files.length === 0) {
      return res.status(200).json({ total: 0, results: [] });
    }

    // 2) Traitement (parallélisé)
    const resultsPromise = files.map(async (file: { name: any; }) => {
      const path = `${FOLDER}/${file.name}`;
      try {
        // Télécharger le fichier binaire
        const { data: fileStream, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
        if (downloadError || !fileStream) {
          throw new Error(downloadError?.message || 'Erreur téléchargement');
        }

        // transformer en Buffer
        const arrayBuffer = await fileStream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extraire données
        // const extracted = await extractCVData(buffer);

        // Attacher chemin/URL du fichier (on stocke le path relatif pour plus de sécurité)

        const extracted: Candidat = {
          nom: null,
          prenom: null,
          email: null,
          telephone: null,
          adresse: null,
          linkedin: null,
          github: null,
          autres_liens: null,
          //competences: null,
          experiences: null,
          formations: null,
          langues: null,
          certifications: null,
          resume: null,
          objectif: null,
          fichier_cv_url: null,
          date_analyse: new Date().toISOString(),
          competences: []
        };

        extracted.fichier_cv_url = path;


        // Préparer données pour upsert en respectant le schéma (nom/prenom/email...)
        // NOTE: certains champs sont json/array, supabase-js sait mapper JS arrays/objects
        const candidatRow: any = {
          nom: extracted.nom ?? null,
          prenom: extracted.prenom ?? null,
          email: extracted.email ?? null,
          telephone: extracted.telephone ?? null,
          adresse: extracted.adresse ?? null,
          linkedin: extracted.linkedin ?? null,
          github: extracted.github ?? null,
          autres_liens: extracted.autres_liens ?? null,
          competences: extracted.competences ?? null,
          experiences: extracted.experiences ?? null,
          formations: extracted.formations ?? null,
          langues: extracted.langues ?? null,
          certifications: extracted.certifications ?? null,
          resume: extracted.resume ?? null,
          objectif: extracted.objectif ?? null,
          fichier_cv_url: extracted.fichier_cv_url ?? null,
          date_analyse: new Date().toISOString()
        };

        // Upsert: on utilise 'email' comme clé pour éviter doublons si email existe
        // Assure-toi d'avoir un index unique sur email dans ta table supabase pour que onConflict fonctionne.
        const { error: upsertError } = await supabase
          .from('candidat')
          .upsert(candidatRow, { onConflict: 'email' });

        if (upsertError) {
          throw upsertError;
        }

        return { file: file.name, status: 'ok', data: candidatRow } as ParseResult;
      } catch (err: any) {
        console.error(`Erreur fichier ${file.name}:`, err);
        return { file: file.name, status: 'failed', reason: err?.message || String(err) } as ParseResult;
      }
    });

    const results = await Promise.all(resultsPromise);

    type ParseResult = {
      file: string;
      status: 'ok' | 'failed';
      data?: {
        email?: string;
        [key: string]: any;
      };
      reason?: string;
    };


    // 3) Après l'upsert, on peut récupérer en base les candidats analysés (avec email présent)
    const emails = results
    //.filter((r: { status: string; data: { email: any; }; }) => r.status === 'ok' && r.data?.email)
    //.map((r: { data: { email: any; }; }) => r.data.email);
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

    // Réponse -- renvoyer results (par fichier) + candidats récupérés en base
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
