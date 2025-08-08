// utils/extractCVData.ts
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface CVData {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  competences?: string[];
  experiences?: string[];
  texte_brut?: string;
}

export async function extractCVData(fileBuffer: Buffer): Promise<CVData> {
  let text = '';

  // Détection du type de fichier
  const isPDF = fileBuffer.slice(0, 4).toString() === '%PDF';
  const isDOCX = fileBuffer.slice(0, 2).toString('hex') === '504b'; // DOCX = zip

  if (isPDF) {
    const pdfData = await pdf(fileBuffer);
    text = pdfData.text;
  } else if (isDOCX) {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    text = value;
  } else {
    throw new Error('Format de fichier non supporté');
  }

  // Extraction basique des infos
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  const phoneMatch = text.match(/(\+?\d[\d .-]{7,}\d)/);
  
  const lignes = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const nomComplet = lignes[0] || '';
  const [prenom, ...nomParts] = nomComplet.split(' ');
  const nom = nomParts.join(' ');

  // Recherche compétences (ex: mots clés)
  const skillsKeywords = ['JavaScript', 'Node.js', 'React', 'PHP', 'Python', 'SQL', 'WordPress', 'AWS'];
  const competencesTrouvees = skillsKeywords.filter(skill =>
    new RegExp(`\\b${skill}\\b`, 'i').test(text)
  );

  // Recherche expériences
  const experiencesTrouvees = lignes.filter(l => /20\d{2}/.test(l));

  return {
    nom,
    prenom,
    email: emailMatch ? emailMatch[0] : undefined,
    telephone: phoneMatch ? phoneMatch[0] : undefined,
    competences: competencesTrouvees,
    experiences: experiencesTrouvees.slice(0, 5),
    texte_brut: text,
  };
}
