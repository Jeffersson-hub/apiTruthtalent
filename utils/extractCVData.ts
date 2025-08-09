// utils/extractCVData.ts
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export type Candidat = {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse?: string | null;
  linkedin?: string | null;
  github?: string | null;
  autres_liens?: string[] | null;
  competences: string[];
  experiences?: string[] | null;
  formations?: string[] | null;
  langues?: string[] | null;
  certifications?: string[] | null;
  resume?: string | null;
  objectif?: string | null;
  fichier_cv_url?: string | null;
  date_analyse?: string;
};

interface candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  linkedin: string | null;
  github: string | null;
  autres_liens: string | null;
  competences: string[] | null;
  experiences: any | null;
  formations: any | null;
  langues: any | null;
  certifications: any | null;
  resume: string | null;
  objectif: string | null;
  fichier_cv_url: string | null;
  date_analyse?: string;
  cv_text?: string;
}


function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  // Enlever espaces superflus
  return raw.replace(/\s+/g, ' ').trim();
}

function firstMatch(regex: RegExp, text: string) {
  const m = text.match(regex);
  return m ? m[0] : null;
}

export async function extractCVData(fileBuffer: Buffer): Promise<CVData> {
  // 1) Extraire texte en fonction du type
  let text = '';
  const header = fileBuffer.slice(0, 4).toString();
  const isPDF = header === '%PDF';
  const isDocx = fileBuffer.slice(0, 2).toString('hex') === '504b'; // zip -> docx

  if (isPDF) {
    const data = await pdf(fileBuffer);
    text = (data && data.text) ? data.text : '';
  } else if (isDocx) {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    text = value || '';
  } else {
    // fallback: try to convert to utf8 string
    text = fileBuffer.toString('utf8');
  }

  // Normaliser
  text = text.replace(/\r/g, '\n');

  // 2) Extraire email / phone / urls
  const email = firstMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i, text);
  const phoneRaw = firstMatch(/(\+?\d[\d .()/-]{6,}\d)/, text);
  const telephone = normalizePhone(phoneRaw);

  // 3) Extraire liens (LinkedIn / GitHub / autres)
  const linkedin = firstMatch(/https?:\/\/(www\.)?linkedin\.com\/[^\s,;]*/i, text);
  const github = firstMatch(/https?:\/\/(www\.)?github\.com\/[^\s,;]*/i, text);
  // Autres liens (portfolio, site perso)
  const urlRegex = /https?:\/\/[^\s,;]+/g;
  const allUrls = (text.match(urlRegex) || []).filter(u => !/linkedin\.com|github\.com/i.test(u));
  const autres_liens = allUrls.length ? Array.from(new Set(allUrls)) : null;

  // 4) Nom / prénom heuristique : on prend les premières lignes (avant ligne vide)
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  let prenom: string | null = null;
  let nom: string | null = null;

  if (lines.length) {
    const first = lines[0];
    // si la première ligne contient un email ou "CV", on cherche une autre ligne
    if (!/@/.test(first) && !/curriculum vitae/i.test(first)) {
      const parts = first.split(/\s+/);
      if (parts.length >= 2) {
        prenom = parts[0];
        nom = parts.slice(1).join(' ');
      } else {
        // fallback, mettre tout dans nom
        nom = first;
      }
    } else {
      // regarde la 2e ligne si disponible
      if (lines[1]) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 2) {
          prenom = parts[0];
          nom = parts.slice(1).join(' ');
        } else {
          nom = lines[1];
        }
      }
    }
  }

  // 5) Compétences : détection par mots-clés (améliorable)
  const skillsKeywords = [
    'JavaScript','TypeScript','Node.js','React','Vue','Angular','PHP','Python','Django',
    'Flask','SQL','PostgreSQL','MySQL','MongoDB','Docker','Kubernetes','AWS','GCP','Azure',
    'WordPress','HTML','CSS','Sass','Tailwind','GraphQL','REST','Git','CI/CD','Jenkins'
  ];
  const competencesFound = skillsKeywords.filter(k => new RegExp(`\\b${k.replace('.', '\\.') }\\b`, 'i').test(text));
  const competences = competencesFound.length ? competencesFound : null;

  // 6) Expériences / formations (heuristique simple)
  // On prend les lignes contenant années (ex: 2019, 2020-2023) comme expériences candidates
  const experienceLines = lines.filter(l => /\b(19|20)\d{2}\b/.test(l));
  // On essaye de regrouper en objets { periode?, poste?, entreprise? }
  const experiences = experienceLines.map(l => {
    const periode = (l.match(/((19|20)\d{2}(\s*[-–]\s*(19|20)\d{2})?)/) || [null])[0];
    // heuristique pour séparer poste / entreprise : split par " - " ou " chez " ou ","
    let reste = l.replace(periode || '', '').trim();
    let poste = reste;
    let entreprise: string | null = null;
    const sep = reste.split(/ - | — | – | chez |, /i);
    if (sep.length >= 2) {
      poste = sep[0].trim();
      entreprise = sep.slice(1).join(', ').trim();
    }
    return { periode: periode || null, poste: poste || null, entreprise: entreprise || null, raw: l };
  });

  // 7) Formations (heuristique : lignes contenant "Diplôme" / "Master" / "Licence" / "Bac" / "Bachelor" / "M.Sc" / "MBA")
  const formationLines = lines.filter(l => /\b(Master|Licence|Bachelor|Bac|Dipl[oô]me|M\.Sc|MBA|BSc|PhD)\b/i.test(l));
  const formations = formationLines.map(l => ({ raw: l }));

  // 8) Langues / certifications
  const languesList = (lines.join(' ').match(/\b(Anglais|Français|Espagnol|German|Allemand|Italiano|Italien|Português)\b/gi) || []).map(s => s.trim());
  const langues = languesList.length ? Array.from(new Set(languesList)) : null;

  const certs = lines.filter(l => /\b(certificat|certification|certifié|certified|CCNA|AWS Certified|PMP|TOEIC|TOEFL)\b/i).slice(0, 10);
  const certifications = certs.length ? certs : null;

  // 9) Resume / objectif : heuristique, recherche sections "Profil", "Résumé", "Objectif"
  const resumeMatch = text.match(/(profil|résumé|summary|about me)[\s\S]{0,400}/i);
  const resume = resumeMatch ? resumeMatch[0].slice(0, 2000) : null;

  const objectifMatch = text.match(/(objectif|objectif professionnel|career objective)[\s\S]{0,200}/i);
  const objectif = objectifMatch ? objectifMatch[0].slice(0, 500) : null;

  export type CVData = {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse?: string | null;
  linkedin?: string | null;
  github?: string | null;
  autres_liens?: string[] | null;
  competences: string[];
  langues?: string[] | null;
  certifications?: string[] | null;
  resume?: string | null;
  objectif?: string | null;
};

  // 10) Retourner l'objet au format table candidats
  const result: CVData = {
    nom,
    prenom,
    email: email || null,
    telephone,
    adresse: null,
    linkedin: linkedin || null,
    github: github || null,
    autres_liens,
    competences,
    experiences: experiences.length ? experiences : null,
    formations: formations.length ? formations : null,
    langues,
    certifications,
    resume,
    objectif,
    fichier_cv_url: null, // rempli par l'API parse (chemin / url)
  };

  return result;
}
