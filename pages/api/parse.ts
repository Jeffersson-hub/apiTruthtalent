// parse.ts
import { Candidat, Experience, Langue, Formation, InsertCandidatResult } from '../../utils/types';
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

// --- Client Supabase ---
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Fonctions d'extraction ---
function extractNom(text: string): string | null {
  const match = text.match(/([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)/);
  return match ? match[0] : null;
}

function extractEmail(text: string): string | null {
  const match = text.match(/\S+@\S+/);
  return match ? match[0] : null;
}

function extractCompetences(text: string): string[] {
  const competencesSection = text.match(/compétences?:([\s\S]*?)(?=\n\w+:|$)/i);
  if (!competencesSection) return [];
  return competencesSection[1].split(',').map(c => c.trim()).filter(c => c.length > 0);
}

function extractExperiences(text: string): Experience[] {
  // Exemple basique : à adapter selon le format de vos CV
  const experienceRegex = /(?:expérience|poste|emploi)[\s\S]*?([A-Z][a-zA-Z\s]+?)\s*(?:chez|@|-)\s*([A-Z][a-zA-Z\s]+?)\s*(?:\(?([\d\-\s]+?)\)?)/g;
  const experiences: Experience[] = [];
  let match;
  while ((match = experienceRegex.exec(text)) !== null) {
    experiences.push({
      poste: match[1].trim(),
      entreprise: match[2].trim(),
      periode: match[3] ? match[3].trim() : null,
      description: null,
    });
  }
  return experiences;
}

function extractFormations(text: string): Formation[] {
  // Regex pour capturer les formations (ex: "Master en Informatique à l'Université de Paris (2018-2020)")
  const formationRegex = /(?:formation|diplôme|études?|licence|master|bac[+\s]?[0-9]*)\s*:?\s*([^\n]+?)(?:\n|$)/gi;
  const formations: Formation[] = [];
  let match;

  while ((match = formationRegex.exec(text)) !== null) {
    const formationText = match[1].trim();
    if (formationText) {
      formations.push({
        raw: formationText,
      });
    }
  }

  return formations;
}

function extractLangues(text: string): Langue[] {
  // Regex pour capturer les langues et niveaux (ex: "Anglais : Courant", "Espagnol - B2")
  const langueRegex = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?:[:-\–]\s*)([A-Za-z0-9\s\-]+)/g;
  const langues: Langue[] = [];
  let match;

  while ((match = langueRegex.exec(text)) !== null) {
    const langue = match[1].trim();
    const niveau = match[2].trim();
    if (langue && niveau) {
      langues.push({
        langue,
        niveau,
      });
    }
  }

  return langues;
}

function extractPrenom(text: string): string | null {
  const prenom = text.match(/([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)/);
  return prenom ? prenom[0] : null;
}

function extractTelephone(text: string): string | null {
  const match = text.match(/(\+?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3})/);
  return match ? match[0] : null;
}

function extractAdresse(text: string): string | null {
  // Exemple basique : à adapter
  return null;
}

function extractLinkedIn(text: string): string | null {
  const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
  return match ? `linkedin.com/in/${match[1]}` : null;
}

// --- Extraction du texte ---
async function extractTextFromBuffer(fileBuffer: Buffer, fileName: string): Promise<string> {
  if (fileName.endsWith('.pdf')) {
    const data = await pdf(fileBuffer);
    return data.text;
  } else if (fileName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } else {
    throw new Error('Format de fichier non supporté. Utilisez PDF ou DOCX.');
  }
}

// --- Extraction des données du CV ---
async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
  const text = await extractTextFromBuffer(fileBuffer, fileName);
  return {
    nom: extractNom(text),
    prenom: extractPrenom(text),
    email: extractEmail(text),
    telephone: extractTelephone(text),
    adresse: extractAdresse(text),
    competences: extractCompetences(text),
    experiences: extractExperiences(text),
    linkedin: extractLinkedIn(text),
    formations: extractFormations(text),
    langues: extractLangues(text),
  };
}

// --- Insertion en base ---
async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    const { data: insertedCandidat, error: candidatError } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();
    if (candidatError) throw candidatError;

    if (candidat.experiences.length > 0) {
      const jobsData = candidat.experiences.map((exp) => ({
        ...exp,
        candidat_id: insertedCandidat.id,
      }));
      await supabase.from('jobs').insert(jobsData);
    }

    if (candidat.competences.length > 0) {
      const skillsData = candidat.competences.map((competence) => ({
        nom: competence,
        candidat_id: insertedCandidat.id,
      }));
      await supabase.from('skills').insert(skillsData);
    }

    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// --- Fonction principale ---
export async function processCV(fileBuffer: Buffer, fileName: string): Promise<InsertCandidatResult> {
  try {
    const candidat = await extractCVData(fileBuffer, fileName);
    return await insertCandidatData(candidat);
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
