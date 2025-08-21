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
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  liens?: string[];
  competences: string[] | null;
  experiences: any[];
  source_fichier: string;
}



