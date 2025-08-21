// pages/api/analyze-cv.ts
import express, { Request, Response } from "express";
import { downloadFromStorage } from "../../services/storage.js";
import { parseCandidateFromBuffer } from "../../services/documentParser.js";
import { supabase } from "../../utils/supabaseClient.js";

const router = express.Router();

router.post("/parse", async (req: Request, res: Response) =>{
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { bucket = process.env.SUPABASE_STORAGE_BUCKET || "truthtalent", path } = req.body || {};
    if (!path) return res.status(400).json({ error: "path manquant" });

    const buf = await downloadFromStorage(bucket, path);
    const filename = path.split("/").pop() || "cv.bin";
    const parsed = await parseCandidateFromBuffer(filename, buf, `${bucket}/${path}`);

    const { error } = await supabase.from("candidats").insert(parsed as any);
    if (error) throw error;

    res.json({ message: "OK" });
  } catch (err) {
res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
