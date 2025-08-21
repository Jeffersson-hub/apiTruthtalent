// pages/api/storage.ts
import express, { Request, Response } from "express";
import { supabase } from "../../utils/supabaseClient";

const router = express.Router();

router.post("/parse", async (req: Request, res: Response) => {
  try {
    const bucket = (req.query.bucket as string) || process.env.SUPABASE_STORAGE_BUCKET || "truthtalent";
    const prefix = (req.query.prefix as string) || "cvs";

    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0
    });
    if (error) throw error;

    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});
