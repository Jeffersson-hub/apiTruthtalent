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
  metier: string | null;
  github: string | null;
  autres_liens: string[] | null;
  competences: string[] | null;
  description: string[] | null,
  experiences: Array<{
    poste: string;
    entreprise: string | null;
    periode: string | null;
    description: string | null;
  }> | null;
  formations: Array<{ raw: string }> | null;
  langues: Array<{
    langue: string;
    niveau: string;
  }> | null;
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
    // ... (code existant pour extraire le texte du PDF/DOCX)

    text = text.replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

    // Extraction des données
    const email: string | null = firstMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i, text);
    const phoneRaw: string | null = firstMatch(/(\+?\d[\d .()/-]{6,}\d)/, text);
    const telephone: string | null = phoneRaw ? normalizePhone(phoneRaw) : null;
    const linkedin: string | null = firstMatch(/https?:\/\/(www\.)?linkedin\.com\/[^\s,;]*/i, text);
    const github: string | null = firstMatch(/https?:\/\/(www\.)?github\.com\/[^\s,;]*/i, text);
    const urlRegex = /https?:\/\/[^\s,;]+/g;
    const allUrls = text.match(urlRegex) || [];
    const autres_liens: string[] | null = allUrls.length ? Array.from(new Set(allUrls.filter(u => !/linkedin\.com|github\.com/i.test(u)))) : null;

    // Extraction du nom et prénom
    let nom: string | null = null;
    let prenom: string | null = null;
    if (lines.length) {
      const firstLine = lines[0];
      if (!/@/.test(firstLine) && !/curriculum vitae|cv/i.test(firstLine)) {
        const nameParts = firstLine.split(/\s+/).filter(part => part.length > 1 && !/\d/.test(part));
        if (nameParts.length >= 2) {
          nom = nameParts[nameParts.length - 1];
          prenom = nameParts.slice(0, -1).join(' ');
        } else if (nameParts.length === 1) {
          nom = nameParts[0];
        }
      }
    }

    // Extraction de l'adresse
    const addressRegex = /(\d{1,5}\s+(?:rue|avenue|boulevard|allée|chemin|impasse|place|square|quai)\s+[A-Za-z\s\-']+,\s*\d{5}\s+[A-Za-z\s\-]+)/i;
    const addressMatch = text.match(addressRegex);
    const adresse: string | null = addressMatch ? addressMatch[0] : null;

    // Extraction du domaine et du métier
    const domaines = ["Informatique", "Marketing", "Finance", "Santé", "Ingénierie", "Ressources Humaines", "Commerce", "Communication"];
    const metiers = ["Développeur", "Chef de projet", "Consultant", "Analyste", "Designer", "Ingénieur", "Comptable", "Responsable"];
    const domaineMatch = domaines.find(domaine => new RegExp(`\\b${domaine}\\b`, 'i').test(text));
    const domaine: string | null = domaineMatch || null;
    const metierMatch = metiers.find(metier => new RegExp(`\\b${metier}\\b`, 'i').test(text));
    const metier: string | null = metierMatch || null;

    // Extraction de la localisation
    const locationRegex = /\b(?:Paris|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|Nice|Strasbourg|Rennes|Montpellier|[A-Z]{1}\d{4}[A-Z]{1}|[A-Z]{2}\s*\d{5})\b/i;
    const locationMatch = text.match(locationRegex);
    const location: string | null = locationMatch ? locationMatch[0] : null;

    // Extraction des compétences
    const technicalSkills = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "Docker", "AWS", "Git", "CI/CD"];
    const functionalSkills = ["Gestion de projet", "Communication", "Leadership", "Analyse", "Stratégie"];
    const competences: string[] = [...technicalSkills, ...functionalSkills].filter(skill =>
      new RegExp(`\\b${skill.replace('.', '\\.')}\\b`, 'i').test(text)
    );

    // Extraction des expériences
    const experienceLines = lines.filter(l =>
      /\b(19|20)\d{2}\b/.test(l) &&
      /\b(Poste|Entreprise|Responsable|Chez|At|Expérience|Emploi)\b/i.test(l)
    );
    const experiences = experienceLines.length
      ? experienceLines.map(l => {
          const periodeMatch = l.match(/((19|20)\d{2}(\s*[-–]\s*(19|20)\d{2})?)/);
          const periode: string | null = periodeMatch ? periodeMatch[0] : null;
          let reste = l.replace(periode || '', '').trim();
          let poste: string | null = reste;
          let entreprise: string | null = null;
          const sep = reste.split(/ - | — | – | chez |, | @ /i);
          if (sep.length >= 2) {
            poste = sep[0].trim();
            entreprise = sep.slice(1).join(', ').trim();
          }
          return { periode, poste, entreprise, description: null };
        })
      : null;

    // Extraction des formations
    const formationLines = lines.filter(l =>
      /\b(Master|Licence|Bachelor|Bac|Diplôme|M\.Sc|MBA|BSc|PhD|Université|École|Faculté)\b/i.test(l)
    );
    const formations = formationLines.length
      ? formationLines.map(l => ({ raw: l }))
      : null;

    // Extraction des langues
    const languesList = (text.match(/\b(Anglais|Français|Espagnol|Allemand|Italien|Portugais|Arabe|Chinois|Russe|Niveau (A1|A2|B1|B2|C1|C2)|Courant|Intermédiaire|Débutant)\b/gi) || [])
      .map(s => s.trim());
    const langues = languesList.length
      ? languesList.reduce((acc: { langue: string; niveau: string }[], item) => {
          const niveauMatch = item.match(/Niveau (A1|A2|B1|B2|C1|C2)|Courant|Intermédiaire|Débutant/i);
          if (niveauMatch) {
            const last = acc[acc.length - 1];
            if (last) last.niveau = niveauMatch[0];
          } else {
            acc.push({ langue: item, niveau: "Inconnu" });
          }
          return acc;
        }, [])
      : null;

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
      adresse,
      salary: null,
      linkedin,
      user_id: null,
      domaine,
      location,
      description: null,
      metier,
      github,
      autres_liens,
      competences: competences.length ? competences : null,
      experiences: experiences?.length ? experiences : null,
      formations: formations?.length ? formations : null,
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