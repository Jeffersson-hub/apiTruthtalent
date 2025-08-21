// pages/api/list-cv.ts
import express, { Request, Response } from "express";
import { supabase } from "../../utils/supabaseClient";


const router = express.Router();

router.post("/parse", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("candidats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

export default router;
