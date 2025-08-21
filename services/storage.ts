// services/storage.ts
import express, { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import pdfParse from "pdf-parse";
import { CandidatExtractedData } from "../types/candidats.js";

const router = express.Router();

export async function uploadToStorage(bucket: string, path: string, buffer: Buffer, mimeType?: string) {
  // Implémentation ici
}

router.post("/parse", async (_req: Request, res: Response) => {
  console.log("🚀 Début extraction de tous les fichiers du bucket");

  // 1️⃣ Lister les fichiers du bucket
  const { data: files, error: listError } = await supabase.storage
    .from("truthtalent")
    .list("", { limit: 100 });

  if (listError) {
    console.error("❌ Erreur listage:", listError);
    return res.status(500).json({ error: listError.message });
  }

  if (!files || files.length === 0) {
    return res.status(200).json({ message: "Aucun fichier trouvé" });
  }

  console.log(`📂 ${files.length} fichiers trouvés`);

  const results: any[] = [];

  // 2️⃣ Parcourir tous les fichiers
  for (const file of files) {
    try {
      console.log(`⬇ Téléchargement de: ${file.name}`);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("truthtalent")
        .download(file.name);

      if (downloadError || !fileData) {
        console.error(`❌ Erreur téléchargement ${file.name}:`, downloadError);
        continue;
      }

      // 3️⃣ Lire le PDF
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfText = await pdfParse(buffer);

      console.log(`📄 ${file.name} extrait (200 premiers chars):`, pdfText.text.slice(0, 200));

      // 4️⃣ Construire les données
      const candidat: CandidatExtractedData = {
        nom: "Inconnu",
        prenom: "Inconnu",
        email: null,
        telephone: null,
        adresse: null,
        competences: [],
        liens: undefined,
        experiences: [],
        source_fichier: ""
      };

      // 5️⃣ Insertion en base
      const { error: insertError } = await supabase
        .from("candidats")
        .insert(candidat);

      if (insertError) {
        console.error(`❌ Erreur insertion DB (${file.name}):`, insertError);
      } else {
        console.log(`✅ Insertion OK pour ${file.name}`);
        results.push({ file: file.name, status: "OK" });
      }
    } catch (err) {
      console.error(`⚠️ Erreur générale pour ${file.name}:`, err);
    }
  }

  res.status(200).json({
    message: "Analyse terminée",
    fichiers_traites: results.length,
    details: results,
  });
});
// Ajoutez cette fonction si elle n'existe pas
export async function downloadFromStorage(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    throw new Error(`Erreur lors du téléchargement de ${path}: ${error?.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export default router;
