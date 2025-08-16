export interface Experience {
  poste: string;
  entreprise: string;
  periode: string;
  description: string;
}

export interface Langue {
  langue: string;
  niveau: string;
}

export interface Formation {
  raw: string;
}

export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences: string[];
  experiences: Experience[];
  linkedin: string | null;
  formations: Formation[];
  langues: Langue[];
}

export interface InsertCandidatResult {
  success: boolean;
  candidatId?: string;
  error?: Error;
}
