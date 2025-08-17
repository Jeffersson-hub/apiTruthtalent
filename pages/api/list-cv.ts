// pages/api/list-cv.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';


interface Candidat {
  id: string;
  nom: string | null;
  email: string | null;
  // Ajoutez d'autres champs si nécessaire
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Candidat[] | { error: string }>
) {
  try {
    const { data: candidats, error } = await supabase
      .from('candidats')
      .select('id, nom, email');

    if (error) throw error;

    res.status(200).json(candidats || []);
  } catch (err) {
    console.error('Failed to fetch CVs:', err); 
    res.status(500).json({ error: 'Failed to fetch CVs' });
  }
}
