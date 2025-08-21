// utils/nameExtractor.ts
export function splitName(text: string): { nom: string | null; prenom: string | null } {
  // Exemple de logique pour extraire le nom et le prénom
  // Cette logique peut être améliorée en fonction de vos besoins spécifiques

  // Recherche de mots qui pourraient être des noms ou prénoms
  const nameRegex = /([A-Z][a-zA-Z'-]+)\s+([A-Z][a-zA-Z'-]+)/g;
  const matches = text.matchAll(nameRegex);

  let nom: string | null = null;
  let prenom: string | null = null;

  for (const match of matches) {
    if (match[1] && match[2]) {
      nom = match[1];
      prenom = match[2];
      break; // Prendre le premier match
    }
  }

  return { nom, prenom };
}
