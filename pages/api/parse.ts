import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configurer pdfjs-dist
GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';


interface ParseResultSuccess {
  status: "success";
  text: string;
}

interface ParseResultFailure {
  status: "failed";
  reason: string;
}

type ParseResult = ParseResultSuccess | ParseResultFailure;

// Interface pour les données d'un candidat
interface Candidat {
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  competences: string[];
  experiences: Array<{
    poste: string;
    entreprise: string | null;
    periode: string | null;
    description: string | null;
  }>;
  linkedin: string | null;
  formations: Array<{ raw: string }>;
  langues: Array<{ langue: string; niveau: string }>;
}

// Configuration CORS
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: ['https://truthtalent.online', 'https://apitruthtalent.vercel.app'],
});

// Middleware pour gérer le CORS
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// Initialisation du client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Parsing générique d'un fichier
async function parseFile(buffer: Buffer, fileName: string): Promise<ParseResult> {
  try {
    if (fileName.endsWith('.pdf')) {
      return await parsePDF(buffer);
    } else if (fileName.endsWith('.docx')) {
      return await parseDOCX(buffer);
    } else {
      return { status: "failed", reason: "Format de fichier non supporté" };
    }
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}


async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const loadingTask = getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    return { status: "success", text };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { status: "success", text: result.value };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}


// Extraction des informations depuis le texte
function extractInfoFromText(text: string): Partial<Candidat> {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Regex pour email
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const emails = cleanText.match(emailRegex) || ["inconnu"];

  // Regex pour téléphone (FR/UE)
  const phoneRegex = /(\+33|0)[1-9](\s*\d{2}){4}/g;
  const phones = cleanText.match(phoneRegex) || [null];

  // Regex pour nom/prénom
  const nomRegex = /(?:Nom|Name|CV de|Candidature de)[:\s]*(?:[A-Z][a-z]+)/gi;
  const prenomRegex = /(?:Prénom|First Name)[:\s]*(?:[A-Z][a-z]+)/gi;

  const nomMatch = cleanText.match(nomRegex);
  const prenomMatch = cleanText.match(prenomRegex);

  return {
    nom: nomMatch ? nomMatch[0] : "Inconnu",
    prenom: prenomMatch ? prenomMatch[0] : "Inconnu",
    email: emails[0],
    telephone: phones[0],
    competences: extractCompetences(cleanText),
    experiences: extractExperiences(cleanText),
    formations: extractFormations(cleanText),
    langues: extractLangues(cleanText),
    adresse: null,
    linkedin: null,
  };
}

// Exemple de fonction pour extraire les compétences
function extractCompetences(text: string): string[] {
  const competencesRegex = /(?:Compétences|Skills|Competences)[:\s]*(.*?)(?=\n\n|\n$)/gis;
  const match = text.match(competencesRegex);
  if (!match) return [];
  const competencesText = match[0].replace(/Compétences|Skills|Competences[:\s]*/i, '');
  return competencesText.split(/[,;\n]/).map(c => c.trim()).filter(c => c);
}

// Exemple de fonction pour extraire les expériences
function extractExperiences(text: string): Candidat["experiences"] {
  const experiencesRegex = /(?:Expérience|Experience|Expériences)[:\s]*(.*?)(?=\n\n|\n$)/gis;
  const match = text.match(experiencesRegex);
  if (!match) return [];
  const experiencesText = match[0].replace(/Expérience|Experience|Expériences[:\s]*/i, '');
  return experiencesText.split(/\n/).map(e => ({
    poste: e.trim(),
    entreprise: null,
    periode: null,
    description: null,
  })).filter(e => e.poste);
}

// Exemple de fonction pour extraire les formations
function extractFormations(text: string): Array<{ raw: string }> {
  const formationsRegex = /(?:Formation|Education|Formations)[:\s]*(.*?)(?=\n\n|\n$)/gis;
  const match = text.match(formationsRegex);
  if (!match) return [];
  const formationsText = match[0].replace(/Formation|Education|Formations[:\s]*/i, '');
  return formationsText.split(/\n/).map(f => ({ raw: f.trim() })).filter(f => f.raw);
}

// Exemple de fonction pour extraire les langues
function extractLangues(text: string): Array<{ langue: string; niveau: string }> {
  const languesRegex = /(?:Langues|Languages|Langue)[:\s]*(.*?)(?=\n\n|\n$)/gis;
  const match = text.match(languesRegex);
  if (!match) return [];
  const languesText = match[0].replace(/Langues|Languages|Langue[:\s]*/i, '');
  return languesText.split(/[,;\n]/).map(l => {
    const [langue, niveau = "Non spécifié"] = l.trim().split(/\s+-\s+/);
    return { langue, niveau };
  }).filter(l => l.langue);
}

// Fonction pour extraire les données d'un PDF depuis une URL
async function extractFromPDF(url: string): Promise<Partial<Candidat>> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parsePDF(buffer);

    if (parsed.status === "success") {
      return extractInfoFromText(parsed.text);
    } else {
      console.error("Erreur parsing PDF:", parsed.reason);
      return {};
    }
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    return {};
  }
}


// Fonction pour extraire les données d'un DOCX depuis une URL
async function extractFromDOCX(url: string): Promise<Partial<Candidat>> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseDOCX(buffer);
    if (parsed.status === "success") {
      return extractInfoFromText(parsed.text);
    } else {
      throw new Error(parsed.reason);
    }
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

  if (req.method === 'GET') {
    // Logique pour GET (Supabase)
    console.log('--- Début analyse GET ---');
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
              cvData = await extractFromPDF(publicUrl);
            } else if (file.name.endsWith('.docx')) {
              cvData = await extractFromDOCX(publicUrl);
            } else {
              throw new Error('Format de fichier non supporté');
            }

            // Préparer les données pour l'insertion
            const candidat: Candidat = prepareCandidatForInsertion(cvData);

            // 3. Insérer dans la table candidats
            const { data: insertedCandidat, error: insertError } = await supabase
              .from('candidats')
              .insert([candidat])
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
  else if (req.method === 'POST') {
    // Logique pour POST (upload direct)
    console.log('--- Début analyse POST ---');
    try {
      const files = req.body.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }

      const results = await Promise.all(
        files.map(async (file: any) => {
          const buffer = Buffer.from(file.buffer.data);
          const parsed = await parseFile(buffer, file.name);

          if (parsed.status === "success") {
            const info = extractInfoFromText(parsed.text);
            return { file: file.name, status: "success", candidat: [info] };
          } else {
            return { file: file.name, status: "failed", reason: parsed.reason };
          }
        })
      );

      res.status(200).json({ total_files: files.length, results });
    } catch (err) {
      console.error("Erreur globale :", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Erreur serveur" });
    }
  }
  else {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
}
