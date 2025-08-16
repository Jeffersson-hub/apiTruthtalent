// /pages/api/parse.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { processFiles } from "../../services/processFiles";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Liste de fichiers invalide" });
    }

    const results = await processFiles(files);

    return res.status(200).json({
      message: "Analyse terminée",
      results,
    });
  } catch (error) {
    console.error("❌ Erreur API parse:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
