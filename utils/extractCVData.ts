import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  salary: number | null;
  linkedin: string | null;
  user_id: string | null;
  domaine: string | null;
  location: string | null;
  description: string | null;
  metier: string | null;
  github: string | null;
  autres_liens: string[] | null;
  competences: string[] | null;
  experiences: Array<{
    periode: string | null;
    poste: string | null;
    entreprise: string | null;
  }> | null;
  formations: Array<{ raw: string }> | null;
  langues: string[] | null;
  certifications: string[] | null;
  resume: string | null;
  objectif: string | null;
  fichier_cv_url: string | null;
  date_analyse?: string;
}

function firstMatch(regex: RegExp, text: string): string | null {
  const match = text.match(regex);
  return match ? match[0] : null;
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/\s+/g, ' ').trim();
}

export async function extractCVData(fileBuffer: Buffer): Promise<Candidat> {
  let text = '';
  try {
    const header = fileBuffer.slice(0, 4).toString();
    const isPDF = header === '%PDF';
    const isDocx = fileBuffer.slice(0, 2).toString('hex') === '504b'; // Signature ZIP (DOCX)

    if (isPDF) {
      const data = await pdf(fileBuffer);
      text = data?.text || '';
    } else if (isDocx) {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      text = value || '';
    } else {
      text = fileBuffer.toString('utf8');
    }

    text = text.replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();

    // Extraction des données
    const email: string | null = firstMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i, text);
    const phoneRaw: string | null = firstMatch(/(\+?\d[\d .()/-]{6,}\d)/, text);
    const telephone: string | null = phoneRaw ? normalizePhone(phoneRaw) : null;
    const linkedin: string | null = firstMatch(/https?:\/\/(www\.)?linkedin\.com\/[^\s,;]*/i, text);
    const github: string | null = firstMatch(/https?:\/\/(www\.)?github\.com\/[^\s,;]*/i, text);

    // Extraction des URLs supplémentaires
    const urlRegex = /https?:\/\/[^\s,;]+/g;
    const allUrls = text.match(urlRegex) || [];
    const autres_liens: string[] | null = allUrls.length ? Array.from(new Set(allUrls.filter(u => !/linkedin\.com|github\.com/i.test(u)))) : null;

    // Extraction du nom et prénom
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    let nom: string | null = null;
    let prenom: string | null = null;
    if (lines.length) {
      const firstLine = lines[0];
      if (!/@/.test(firstLine) && !/curriculum vitae/i.test(firstLine)) {
        const parts = firstLine.split(/\s+/);
        if (parts.length >= 2) {
          prenom = parts[0];
          nom = parts.slice(1).join(' ');
        } else {
          nom = firstLine;
        }
      }
    }

    // Extraction des compétences
    const skillsKeywords = [
      'JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue', 'Angular', 'PHP', 'Python', 'Django',
      'Flask', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
      'WordPress', 'HTML', 'CSS', 'Sass', 'Tailwind', 'GraphQL', 'REST', 'Git', 'CI/CD', 'Jenkins'
    ];
    const competences: string[] = skillsKeywords.filter(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(text));

    // Extraction des expériences
    const experienceLines = lines.filter(l => /\b(19|20)\d{2}\b/.test(l));
    const experiences = experienceLines.map(l => {
      const periodeMatch = l.match(/((19|20)\d{2}(\s*[-–]\s*(19|20)\d{2})?)/);
      const periode: string | null = periodeMatch ? periodeMatch[0] : null;
      let reste = l.replace(periode || '', '').trim();
      let poste: string | null = reste;
      let entreprise: string | null = null;
      const sep = reste.split(/ - | — | – | chez |, /i);
      if (sep.length >= 2) {
        poste = sep[0].trim();
        entreprise = sep.slice(1).join(', ').trim();
      }
      return { periode, poste, entreprise };
    });

    // Extraction des formations
    const formationLines = lines.filter(l => /\b(Master|Licence|Bachelor|Bac|Dipl[oô]me|M\.Sc|MBA|BSc|PhD)\b/i.test(l));
    const formations = formationLines.map(l => ({ raw: l }));

    // Extraction des langues
    const languesList = (lines.join(' ').match(/\b(Anglais|Français|Espagnol|German|Allemand|Italiano|Italien|Português)\b/gi) || []).map(s => s.trim());
    const langues: string[] | null = languesList.length ? Array.from(new Set(languesList)) : null;

    // Extraction des certifications
    const certs = lines.filter(l => /\b(certificat|certification|certifié|certified|CCNA|AWS Certified|PMP|TOEIC|TOEFL)\b/i.test(l)).slice(0, 10);
    const certifications: string[] | null = certs.length ? certs : null;

    // Extraction du résumé
    const resumeMatch = text.match(/(profil|résumé|summary|about me)[\s\S]{0,400}/i);
    const resume: string | null = resumeMatch ? resumeMatch[0].slice(0, 2000) : null;

    // Extraction de l'objectif
    const objectifMatch = text.match(/(objectif|objectif professionnel|career objective)[\s\S]{0,200}/i);
    const objectif: string | null = objectifMatch ? objectifMatch[0].slice(0, 500) : null;

    return {
      nom,
      prenom,
      email,
      telephone,
      adresse: null,
      salary: null,
      linkedin,
      user_id: null,
      domaine: null,
      location: null,
      description: null,
      metier: null,
      github,
      autres_liens,
      competences: competences.length ? competences : null,
      experiences: experiences.length ? experiences : null,
      formations: formations.length ? formations : null,
      langues,
      certifications,
      resume,
      objectif,
      fichier_cv_url: null,
      date_analyse: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error extracting CV data:', error);
    throw error;
  }
}
