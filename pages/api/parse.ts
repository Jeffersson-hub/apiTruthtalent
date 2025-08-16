// parse.ts
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

// --- Interfaces ---
interface Experience {
  poste: string | null;
  entreprise: string | null;
  periode: string | null;
  description: string | null;
}

interface Langue {
  langue: string;
  niveau: string;
}

interface Formation {
  raw: string;
}

interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences: string[];
  experiences: Experience[];
  linkedin: string | null;
  formations: Formation[];
  langues: Langue[];
}

interface InsertCandidatResult {
  success: boolean;
  candidatId?: string;
  error?: Error;
}

// --- Client Supabase ---
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Fonction d'extraction ---
async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
  let text = '';
  if (fileName.endsWith('.pdf')) {
    const data = await pdf(fileBuffer);
    text = data.text;
  } else if (fileName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    text = result.value;
  } else {
    throw new Error('Format de fichier non supporté. Utilisez PDF ou DOCX.');
  }

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

// --- Fonctions d'extraction basiques ---
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
  return [];
}

function extractFormations(text: string): Formation[] {
  return [];
}

function extractLangues(text: string): Langue[] {
  return [];
}

function extractPrenom(text: string): string | null {
  return null;
}

function extractTelephone(text: string): string | null {
  return null;
}

function extractAdresse(text: string): string | null {
  return null;
}

function extractLinkedIn(text: string): string | null {
  return null;
}

// --- Fonction d'insertion ---
async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    const { data: insertedCandidat, error: candidatError } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();

    if (candidatError) throw candidatError;

    if (candidat.experiences.length > 0) {
      const jobsData = candidat.experiences.map((exp: Experience) => ({
        ...exp,
        candidat_id: insertedCandidat.id,
      }));
      await supabase.from('jobs').insert(jobsData);
    }

    if (candidat.competences.length > 0) {
      const skillsData = candidat.competences.map((competence: string) => ({
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
