import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from("candidats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error });

  return res.status(200).json(data);
}
