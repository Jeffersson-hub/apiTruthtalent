// pages/api/analyze-cv.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import mammoth from 'mammoth'; // pour docx
import pdfParse from 'pdf-parse'; // pour pdf

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fileName } = req.query;

  if (!fileName) return res.status(400).json({ error: 'fileName requis' });

  // 1. Télécharger le fichier depuis Supabase Storage
  const { data, error } = await supabase.storage
    .from('truthtalent')
    .download(fileName as string);

  if (error) return res.status(500).json({ error: error.message });

  // 2. Lire le contenu du fichier
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text = '';
  if (fileName.toString().endsWith('.pdf')) {
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
  } else if (fileName.toString().endsWith('.docx')) {
    const docData = await mammoth.extractRawText({ buffer });
    text = docData.value;
  }

  // 3. Extraire infos (exemple simple)
  const nameMatch = text.match(/Nom\s*:\s*(.+)/i);
  const name = nameMatch ? nameMatch[1] : null;

  // 4. Sauvegarder dans DB
  const { error: insertError } = await supabase
    .from('candidats')
    .insert([{ file_name: fileName, nom: name, texte_complet: text }]);

  if (insertError) return res.status(500).json({ error: insertError.message });

  res.status(200).json({ success: true, nom: name });
}
