// pages/api/candidats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { data, error } = await supabase.from('candidats').select('*');
    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
