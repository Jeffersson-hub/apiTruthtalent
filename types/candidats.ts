export interface Formation {
  raw: string;        // jamais null
}

export interface Langue {
  langue: string;     // jamais null
  niveau: string;     // jamais null
}

export interface Experience {
  poste: string;
  entreprise: string;
  periode?: string | null;
  description?: string | null;
}

export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences: string[];
  experiences: Experience[];
  linkedin?: string | null;
  formations: Formation[];
  langues: Langue[];
}
