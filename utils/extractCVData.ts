// utils/extractCVData.ts
import { Candidat, Formation, Langue, Experience } from '../types/candidats';

// Ensuite tu passes `fileBuffer` à ton extracteur
// const candidatData = await extractCVData(fileBuffer, fileName);

// Fonction pour extraire les formations
export function extractFormations(text: string): Formation[] {
  // Regex pour capturer les sections "Formation", "Diplôme", "Études", etc.
  const formationRegex = /(?:formation|diplôme|études?|licence|master|bac[+\s]?[0-9]*)\s*:?\s*([^\n]+?)(?=\n|$)/gi;
  const formations: Formation[] = [];
  let match;

  while ((match = formationRegex.exec(text)) !== null) {
    const formationText = match[1].trim();
    if (formationText) {
      formations.push({ raw: formationText });
    }
  }

  return formations;
}

// Fonction pour extraire les langues et leurs niveaux
export function extractLangues(text: string): Langue[] {
  // Regex pour capturer les langues (ex: "Anglais : Courant", "Espagnol - B2")
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

// Fonction pour extraire le prénom
export function extractPrenom(text: string): string | null {
  // Regex pour capturer le prénom (ex: "Jean DUPONT" -> "Jean")
  const match = text.match(/^\s*([A-Z][a-zA-Z]+)\s+[A-Z][a-zA-Z]+/);
  return match ? match[1] : null;
}

// Fonction pour extraire le téléphone (déjà implémentée)
export function extractTelephone(text: string): string | null {
  const match = text.match(/(\+?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3})/);
  return match ? match[0] : null;
}

// Fonction pour extraire l'adresse
export function extractAdresse(text: string): string | null {
  // Regex pour capturer une adresse (ex: "123 Rue de Paris, 75000 Paris")
  const match = text.match(/\d+\s+[A-Za-z\s]+,\s*\d{5}\s+[A-Za-z\s]+/);
  return match ? match[0] : null;
}

// Fonction pour extraire le nom (déjà implémentée)
export function extractNom(text: string): string | null {
  const match = text.match(/([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)/);
  return match ? match[0] : null;
}

// Fonction pour extraire l'email (déjà implémentée)
export function extractEmail(text: string): string | null {
  const match = text.match(/\S+@\S+/);
  return match ? match[0] : null;
}

// Fonction pour extraire les compétences (déjà implémentée)
export function extractCompetences(text: string): string[] {
  const competencesSection = text.match(/compétences?:([\s\S]*?)(?=\n\w+:|$)/i);
  if (!competencesSection) return [];
  return competencesSection[1].split(',').map(c => c.trim()).filter(c => c.length > 0);
}

export function extractExperiences(text: string): Experience[] {
  const experienceRegex = /(?:expérience|poste|emploi)[\s\S]*?([A-Z][a-zA-Z\s]+?)\s*(?:chez|@|-)\s*([A-Z][a-zA-Z\s]+?)\s*(?:\(?([\d\-\s]+?)\)?)/g;
  const experiences: Experience[] = [];
  let match: RegExpExecArray | null;

  while ((match = experienceRegex.exec(text)) !== null) {
    experiences.push({
      poste: match[1].trim(),
      entreprise: match[2].trim(),
      periode: match[3] ? match[3].trim() : null,
      description: null,
      debut: '',
      fin: ''
    });
  }

  return experiences;
}


// Fonction pour extraire le texte depuis le buffer
export async function extractTextFromBuffer(fileBuffer: Buffer, fileName: string): Promise<string> {
  if (fileName.endsWith('.pdf')) {
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(fileBuffer);
    return data.text;
  } else if (fileName.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } else {
    throw new Error('Format de fichier non supporté. Utilisez PDF ou DOCX.');
  }
}

export async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
  const text = await extractTextFromBuffer(fileBuffer, fileName);

  return {
    nom: extractNom(text),
    prenom: extractPrenom(text),
    email: extractEmail(text),
    telephone: extractTelephone(text),
    adresse: extractAdresse(text),
    competences: extractCompetences(text) || [],       // jamais null
    experiences: extractExperiences(text) || [],       // jamais null
    linkedin: extractLinkedIn(text),
    formations: extractFormations(text) || [],         // jamais null
    langues: extractLangues(text) || [],               // jamais null
  };
}


// Fonction pour extraire LinkedIn (exemple basique)
export function extractLinkedIn(text: string): string | null {
  const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
  return match ? `linkedin.com/in/${match[1]}` : null;
}
