export function extractInfoFromText(text: string) {
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
  const phone = text.match(/(\+33|0)[1-9](\s?\d{2}){4}/)?.[0] || '';
  const linkedin = text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s]+/)?.[0] || '';
  const github = text.match(/https?:\/\/(www\.)?github\.com\/[^\s]+/)?.[0] || '';
  const autres_liens = Array.from(new Set(text.match(/https?:\/\/[^\s]+/g) || []))
    .filter(link => !link.includes('linkedin.com') && !link.includes('github.com'));

  // Très basique, tu peux raffiner
  const nom = text.split('\n')[0].split(' ')[0] || '';
  const prenom = text.split('\n')[0].split(' ')[1] || '';
  const resume = text.slice(0, 400); // introduction du début

  // À affiner avec NLP plus tard
  const competences = text.match(/\b(Java|Python|SQL|React|Node\.js|Figma|AWS|Docker|...)?\b/gi) || [];

  return {
    nom,
    prenom,
    email,
    telephone: phone,
    adresse: '', // à extraire plus tard
    linkedin,
    github,
    autres_liens,
    competences,
    experiences: [],
    formations: [],
    langues: [],
    certifications: [],
    resume,
    objectif: '',
  };
}
