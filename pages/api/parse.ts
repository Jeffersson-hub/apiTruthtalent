import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import * as mammoth from 'mammoth';

// --- Définition des interfaces locales ---
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
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Fonction d'extraction des données du CV ---
async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
  let text = '';
  if (fileName.endsWith('.pdf')) {
    const data = await pdf(fileBuffer);
    text = data.text;
  } else if (fileName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    text = result.value;
  } else {
    throw new Error('Format de fichier non supporté.');
  }

  // Retourne une structure valide avec des tableaux vides si aucune donnée n'est extraite
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
  return []; // À implémenter selon ton format de CV
}

function extractFormations(text: string): Formation[] {
  return []; // À implémenter selon ton format de CV
}

function extractLangues(text: string): Langue[] {
  return []; // À implémenter selon ton format de CV
}

function extractPrenom(text: string): string | null {
  return null; // À implémenter
}

function extractTelephone(text: string): string | null {
  return null; // À implémenter
}

function extractAdresse(text: string): string | null {
  return null; // À implémenter
}

function extractLinkedIn(text: string): string | null {
  return null; // À implémenter
}

// --- Fonction d'insertion dans Supabase ---
async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    // 1. Insérer dans 'candidats'
    const { data: insertedCandidat, error: candidatError } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();

    if (candidatError) throw candidatError;

    // 2. Insérer les expériences dans 'jobs' (si le tableau n'est pas vide)
    if (candidat.experiences.length > 0) {
      const jobsData = candidat.experiences.map((exp: Experience) => ({
        poste: exp.poste,
        description: exp.description,
        entreprise: exp.entreprise,
        periode: exp.periode,
        candidat_id: insertedCandidat.id,
      }));
      const { error: jobsError } = await supabase.from('jobs').insert(jobsData);
      if (jobsError) console.error('Erreur insertion jobs:', jobsError);
    }

    // 3. Insérer les compétences dans 'skills' (si le tableau n'est pas vide)
    if (candidat.competences.length > 0) {
      const skillsData = candidat.competences.map((competence: string) => ({
        nom: competence,
        candidat_id: insertedCandidat.id,
      }));
      const { error: skillsError } = await supabase.from('skills').insert(skillsData);
      if (skillsError) console.error('Erreur insertion skills:', skillsError);
    }

    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    console.error('Erreur globale:', error);
    return { success: false, error: error as Error };
  }
}

// --- Fonction principale pour traiter un fichier ---
export async function processCV(fileBuffer: Buffer, fileName: string): Promise<InsertCandidatResult> {
  try {
    const candidat = await extractCVData(fileBuffer, fileName);
    return await insertCandidatData(candidat);
  } catch (error) {
    console.error('Erreur dans processCV:', error);
    return { success: false, error: error as Error };
  }
}
