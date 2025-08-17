// utils/extractCVData.ts
import { Candidat, Experience, Langue, Formation } from './types';
import pdf from 'pdf-parse';
import * as mammoth from 'mammoth';

/* // --- Interfaces pour les données extraites ---
export interface Experience {
  poste: string | null;
  entreprise: string | null;
  periode: string | null;
  description: string | null;
}

export interface Langue {
  langue: string;
  niveau: string;
}

export interface Formation {
  raw: string;
}

export interface Candidat {
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
} */

// --- Fonctions d'extraction basiques ---
export function extractNom(text: string): string | null {
  // Exemple : cherche une chaîne de 2 mots en majuscules (à adapter)
  const match = text.match(/([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)/);
  return match ? match[0] : null;
}

export function extractEmail(text: string): string | null {
  const match = text.match(/\S+@\S+/);
  return match ? match[0] : null;
}

export function extractCompetences(text: string): string[] {
  const competencesSection = text.match(/compétences?:([\s\S]*?)(?=\n\w+:|$)/i);
  if (!competencesSection) return [];
  return competencesSection[1].split(',').map(c => c.trim()).filter(c => c.length > 0);
}

export function extractExperiences(text: string): Experience[] {
  // Exemple : cherche des blocs "Poste chez Entreprise (Période)"
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

export function extractFormations(text: string): Formation[] {
  // À implémenter selon le format de vos CV
  return [];
}

export function extractLangues(text: string): Langue[] {
  const langueRegex = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?:[:-\u2013]\s*)([A-Za-z0-9\s-]+)/g;
  const langues: Langue[] = [];
  let match;

  while ((match = langueRegex.exec(text)) !== null) {
    const langue = match[1].trim();
    const niveau = match[2].trim();
    if (langue && niveau) {
      langues.push({ langue, niveau });
    }
  }

  return langues;
}

export function extractPrenom(text: string): string | null {
  // À implémenter selon le format de vos CV
  return null;
}

export function extractTelephone(text: string): string | null {
  const match = text.match(/(\+?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3})/);
  return match ? match[0] : null;
}

export function extractAdresse(text: string): string | null {
  // À implémenter selon le format de vos CV
  return null;
}

export function extractLinkedIn(text: string): string | null {
  const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
  return match ? `linkedin.com/in/${match[1]}` : null;
}

// --- Extraction du texte depuis le buffer ---
export async function extractTextFromBuffer(fileBuffer: Buffer, fileName: string): Promise<string> {
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

// --- Extraction complète des données du CV ---
export async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
  console.log(`Extraction du fichier ${fileName} (taille: ${fileBuffer.length} octets)`);
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
