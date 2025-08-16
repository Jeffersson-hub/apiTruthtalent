// /services/processFiles.ts
import { supabase } from "../utils/supabase";
import { extractCVData } from "../utils/extractCVData";
import fetch from "node-fetch";
import { Experience } from "../types";

export async function processFiles(filePaths: string[]) {
  const results: any[] = [];

  for (const filePath of filePaths) {
    console.log(`📂 Traitement du fichier: ${filePath}`);

    // 1. Télécharger depuis Supabase
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("truthtalent")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("❌ Erreur téléchargement:", downloadError);
      continue;
    }

    // 2. Transformer en Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extraire les données
    const extractedData: CandidatExtractedData = await extractCVData(buffer);

    if (!extractedData) {
      console.warn("⚠️ Aucune donnée extraite pour:", filePath);
      continue;
    }

    // 4. Insérer dans table `candidats`
    const { data: candidat, error: insertError } = await supabase
      .from("candidats")
      .insert({
        nom: extractedData.nom,
        prenom: extractedData.prenom,
        email: extractedData.email,
        telephone: extractedData.telephone,
        adresse: extractedData.adresse,
        linkedin: extractedData.linkedin,
        fichier: filePath,
      })
      .select()
      .single();

    if (insertError || !candidat) {
      console.error("❌ Erreur insertion candidat:", insertError);
      continue;
    }

    const candidatId = candidat.id;

    // 5. Traiter expériences
    const experiences: Experience[] = Array.isArray(extractedData.experiences)
      ? extractedData.experiences
      : [];

    if (experiences.length > 0) {
      const experienceRecords = experiences.map((exp) => ({
        candidat_id: candidatId,
        poste: exp.poste ?? null,
        description: exp.description ?? null,
        entreprise: exp.entreprise ?? null,
        periode: exp.periode ?? null,
        domaine: exp.domaine ?? null,
        salary: exp.salary ?? null,
        location: exp.location ?? null,
      }));

      const { error: expError } = await supabase
        .from("experiences")
        .insert(experienceRecords);

      if (expError) console.error("❌ Erreur insertion expériences:", expError);
    }

    // 6. Traiter compétences
    const competences: Competence[] = Array.isArray(extractedData.competences)
      ? extractedData.competences
      : [];

    if (competences.length > 0) {
      const competenceRecords = competences.map((comp) => ({
        candidat_id: candidatId,
        nom: comp.nom,
        niveau: comp.niveau ?? null,
      }));

      const { error: compError } = await supabase
        .from("competences")
        .insert(competenceRecords);

      if (compError) console.error("❌ Erreur insertion compétences:", compError);
    }

    // 7. Ajouter au résultat
    results.push({
      candidat,
      experiences,
      competences,
    });
  }

  return results;
}
