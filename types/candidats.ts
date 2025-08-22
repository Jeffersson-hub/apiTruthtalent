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

// types/candidats.ts
export interface Candidat {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  competences: any[]; // Assurez-vous que c'est bien un tableau de chaînes de caractères
  experiences: any[];
  liens?: string[];
  source_fichier?: string | null;
}




