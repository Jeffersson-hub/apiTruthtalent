import { Router } from "express";
import { supabase } from "../utils/supabase";
import { fetchToBuffer } from "../utils/fetchToBuffer";
import { parseCandidateFromBuffer } from "../services/documentParser";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files[] manquant" });
    }

    const results = [];
    for (const url of files) {
      const { buffer, filename } = await fetchToBuffer(url);
      const parsed = await parseCandidateFromBuffer(filename, buffer, url);
      const { error } = await supabase.from("candidats").insert(parsed as any);
      if (error) throw error;
      results.push({ url, parsed });
    }

    res.status(200).json({ ok: true, results });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
