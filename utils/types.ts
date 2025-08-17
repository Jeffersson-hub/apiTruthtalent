export interface Experience {
  poste: string | null;
  entreprise: string | null;
  periode: string | null;
  description: string | null;
}

export interface Langue {
  langue: string | null;
  niveau: string | null;
}

export interface Formation {
  raw: string | null;
}

export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  //adresse: string | null;
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
