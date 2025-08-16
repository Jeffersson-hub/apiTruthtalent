import { Candidat, Experience, Langue, Formation } from './types';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractCVData(fileBuffer: Buffer, fileName: string): Promise<Candidat> {
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
    competences: extractCompetences(text) || [],
    experiences: extractExperiences(text) || [],
    linkedin: extractLinkedIn(text),
    formations: extractFormations(text) || [],
    langues: extractLangues(text) || [],
  };
}

// Exemple de fonctions d'extraction (à adapter)
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

// Dans extractCVData
console.log(`Extraction du fichier ${__filename} (taille: ${Buffer.length} octets)`);
try {
  if (__filename.endsWith('.pdf')) {
    const data = await pdf(Buffer);
    Text = data.text;
    console.log('Extraction PDF réussie.');
  } else if (__filename.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: Buffer });
    Text = result.value;
    console.log('Extraction DOCX réussie.');
  }
} catch (error) {
  console.error('❌ Erreur d\'extraction :', error);
  throw new Error(`Échec de l'extraction : ${error instanceof Error ? error.message : 'Unknown error'}`);
}
