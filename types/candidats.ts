// types/candidats.ts

export interface Experience {
  poste: string;
  entreprise: string;
  debut: string;
  fin: string;
}

export interface Competence {
  nom: string;
  niveau?: string;
}

export interface CandidatExtractedData {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences?: Competence[];   // ✅ tableau
  experiences?: Experience[];
}
