// /types.ts

export interface Experience {
  poste: string | null;
  description: string | null;
  entreprise: string | null;
  periode: string | null;
  domaine: string | null;
  salary: string | null;
  location: string | null;
}

export interface Competence {
  nom: string;
  niveau?: string | null;
}

export interface CandidatExtractedData {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  linkedin: string | null;
  experiences: Experience[];
  competences: Competence[];
}
