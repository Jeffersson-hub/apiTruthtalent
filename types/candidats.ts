// pages/api/candidats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { q, skill, min_score, status } = req.query;

  try {
    let query = supabase.from('candidats').select('*');

    // filtres simples
    if (skill) query = query.ilike('competences', `%${skill}%`);
    if (min_score) query = query.gte('score', Number(min_score));
    if (status) query = query.eq('status', String(status));
    if (q) query = query.ilike('nom', `%${q}%`).or(`prenom.ilike.%${q}%`);

    const { data, error } = await query.order('date_analyse', { ascending: false });

    if (error) throw error;
    
    return res.status(200).json(data || []);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
}
