// utils/extractCVData.ts
import { CandidatExtractedData, Experience, Competence } from "../types";

export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  linkedin: string | null;
  competences: string[];
  experiences: string[];
  formations: string[] | null;
  langues: string[] | null;
}

function firstMatch(regex: RegExp, text: string): string | null {
  return text.match(regex)?.[0] || null;
}

export async function extractCVData(buffer: Buffer): Promise<CandidatExtractedData> {
  // ⚠️ Ici tu mettras ton vrai code d'analyse du CV
  // Pour l'instant, on simule avec un exemple
  const fakeData: Partial<CandidatExtractedData> = {
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@example.com",
    telephone: "+33 6 12 34 56 78",
    adresse: "12 rue de Paris, 75000 Paris",
    linkedin: "https://linkedin.com/in/jeandupont",
    experiences: [
      {
        poste: "Développeur Fullstack",
        description: "Développement d'applications web",
        entreprise: "TechCorp",
        periode: "2020 - 2023",
        domaine: "Informatique",
        salary: "50k",
        location: "Paris",
      },
    ],
    competences: [
      { nom: "JavaScript", niveau: "avancé" },
      { nom: "Node.js", niveau: "intermédiaire" },
    ],
  };

  // ✅ Normalisation pour éviter les erreurs de typage
  return {
    nom: fakeData.nom ?? null,
    prenom: fakeData.prenom ?? null,
    email: fakeData.email ?? null,
    telephone: fakeData.telephone ?? null,
    adresse: fakeData.adresse ?? null,
    linkedin: fakeData.linkedin ?? null,
    experiences: Array.isArray(fakeData.experiences)
      ? fakeData.experiences.map((exp) => ({
          poste: exp.poste ?? null,
          description: exp.description ?? null,
          entreprise: exp.entreprise ?? null,
          periode: exp.periode ?? null,
          domaine: exp.domaine ?? null,
          salary: exp.salary ?? null,
          location: exp.location ?? null,
        }))
      : [],
    competences: Array.isArray(fakeData.competences)
      ? fakeData.competences.map((comp) => ({
          nom: comp.nom ?? "",
          niveau: comp.niveau ?? null,
        }))
      : [],
  };
}
