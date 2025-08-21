// pages/api/handle-resume-upload.ts
import express, { Request, Response } from "express";
import formidable from "formidable";
import { uploadToStorage } from "../../services/storage";
import { parseCandidateFromBuffer } from "../../services/documentParser";
import { supabase } from "../../utils/supabaseClient";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

const router = express.Router();

export const config = {
  api: {
    bodyParser: false // requis pour formidable
  }
};

router.post("/parse", async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { files } = await parseForm(req);
    const file = files.file as unknown as formidable.File;
    if (!file) return res.status(400).json({ error: "Aucun fichier (field name: file)" });

    const filename = file.originalFilename || file.newFilename || "cv.bin";
    const buf = await fsToBuffer(file);
    const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "truthtalent";
    const storagePath = `cvs/${Date.now()}_${filename}`;

    await uploadToStorage(storageBucket, storagePath, buf, file.mimetype || undefined);

    const parsed = await parseCandidateFromBuffer(filename, buf, `${storageBucket}/${storagePath}`);

    const { error } = await supabase.from("candidats").insert({
      nom: parsed.nom,
      prenom: parsed.prenom,
      email: parsed.email,
      telephone: parsed.telephone,
      adresse: parsed.adresse,
      liens: parsed.liens,
      competences: parsed.competences,
      experiences: parsed.experiences,
      source_fichier: parsed.source_fichier
    });

    if (error) throw error;

    return res.status(200).json({ ok: true, parsed, storagePath });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erreur serveur" });
  }
}),



function parseForm(req: express.Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>): { files: any; } | PromiseLike<{ files: any; }> {
    throw new Error("Function not implemented.");
}
function fsToBuffer(file: formidable.File) {
    throw new Error("Function not implemented.");
}

export default router;

function parseForm(req: express.Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>): { files: any; } | PromiseLike<{ files: any; }> {
    throw new Error("Function not implemented.");
}
