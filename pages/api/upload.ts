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


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // ou "https://truthtalent.online" si tu veux limiter
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err || !files['cv-files[]']) {
      return res.status(400).json({ error: 'Erreur lors de la lecture des fichiers' });
    }

    const fileList = Array.isArray(files['cv-files[]']) ? files['cv-files[]'] : [files['cv-files[]']];

    const uploads = [];

    for (const file of fileList) {
      try {
        const fileBuffer = fs.readFileSync(file.filepath);
        const mimetype = file.mimetype || 'application/octet-stream';

        const uploadPath = `cvs/${file.originalFilename}`;

        const { error } = await supabase.storage
          .from('cv') // ⚠️ Le nom de ton bucket Supabase
          .upload(uploadPath, fileBuffer, {
            contentType: mimetype,
            upsert: false,
          });

        if (error) {
          uploads.push({ file: file.originalFilename, success: false, error: error.message });
        } else {
          uploads.push({ file: file.originalFilename, success: true });
        }
      } catch (err) {
        uploads.push({ file: file.originalFilename, success: false, error: String(err) });
      }
    }

    res.status(200).json({ uploads });
  });
}
