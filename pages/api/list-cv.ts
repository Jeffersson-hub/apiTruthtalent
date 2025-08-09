// pages/api/list-cv.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const BUCKET = 'truthtalent';
    const FOLDER = 'cvs';
    const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 });

    if (error) return res.status(500).json({ error: error.message });

    // renvoyer filename + path + updated_at si dispo
    const files = (data || []).map((files: { name: any; updated_at: any; size: any; }) => ({
      name: files.name,
      path: `${FOLDER}/${files.name}`,
      updated_at: files.updated_at || null,
      size: files.size || null
    }));

    return res.status(200).json({ total: files.length, files });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
