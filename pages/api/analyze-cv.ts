// pages/api/analyze-cv.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { downloadFromStorage } from "../../services/storage";
import { parseCandidateFromBuffer } from "../../services/documentParser";
import { supabase } from "../../utils/supabaseClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Logique de traitement ici
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const buffer = await downloadFromStorage("truthtalent", filePath);
    const parsedData = await parseCandidateFromBuffer(filePath, buffer, filePath);

    const { data, error } = await supabase
      .from("candidats")
      .insert(parsedData)
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
