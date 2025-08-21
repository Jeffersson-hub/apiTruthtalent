// pages/api/handle-resume-upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { IncomingForm } from 'formidable';
const form = new IncomingForm();

import { uploadToStorage } from "../../services/storage";
import { parseCandidateFromBuffer } from "../../services/documentParser";
import { supabase } from "../../utils/supabaseClient";
import fs from 'fs';

export const config = { api: { bodyParser: false } };

async function parseForm(req: NextApiRequest): Promise<{ files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({});
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ files });
    });
  });
}

async function fsToBuffer(file: formidable.File): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = fs.createReadStream(file.filepath);
    stream.on('data', (chunk: string | Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { files } = await parseForm(req);
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: "Aucun fichier (field name: file)" });
    const filename = file.originalFilename || file.newFilename || "cv.bin";
    const buf = await fsToBuffer(file);
    const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "truthtalent";
    const storagePath = `cvs/${Date.now()}_${filename}`;
    await uploadToStorage(storageBucket, storagePath, buf, file.mimetype || undefined);
    const parsed = await parseCandidateFromBuffer(filename, buf, `${storageBucket}/${storagePath}`);
    const { error } = await supabase.from("candidats").insert({
      nom: parsed.nom,
      prenom: parsed.prenom,
      email: parsed.email,
      telephone: parsed.telephone,
      adresse: parsed.adresse,
      liens: parsed.liens || [],
      competences: parsed.competences,
      experiences: parsed.experiences,
      source_fichier: parsed.source_fichier,
    });
    if (error) throw error;
    return res.status(200).json({ ok: true, parsed, storagePath });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erreur serveur" });
  }
}
