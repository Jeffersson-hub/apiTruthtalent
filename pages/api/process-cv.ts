// pages/api/process-cv.ts
import express, { Request, Response } from "express";
import { supabase } from "../../utils/supabaseClient";
import { parseCandidateFromBuffer } from "../../services/documentParser";
import { CandidatExtractedData } from "../../types/candidats";

const router = express.Router();

router.post("/parse", async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files[] manquant" });
    }

    
const results: Array<{ url: string; parsed: CandidatExtractedData }> = [];
for (const url of files) {
  const { buffer, filename } = await fetchToBuffer(url);
  const parsed = await parseCandidateFromBuffer(filename, buffer, url);
  const { error } = await supabase.from("candidats").insert(parsed as any);
  if (error) throw error;
  results.push({ url, parsed });
}
    return res.status(200).json({ ok: true, results });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erreur serveur" });
  }
},

async function fetchToBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const arr = await resp.arrayBuffer();
  const buffer = Buffer.from(arr);
  const filename = url.split("?")[0].split("/").pop() || "cv.bin";
  return { buffer, filename };
})

function fetchToBuffer(url: any): { buffer: any; filename: any; } | PromiseLike<{ buffer: any; filename: any; }> {
  throw new Error("Function not implemented.");
};

export default router;