// /cv-api/pages/api/upload.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Autoriser WordPress (CORS)
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // ou spécifie ton domaine pour + de sécurité
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err || !files['cv-files[]']) {
      return res.status(400).json({ error: 'Erreur lors de la lecture des fichiers' });
    }

    const fileList = Array.isArray(fi
