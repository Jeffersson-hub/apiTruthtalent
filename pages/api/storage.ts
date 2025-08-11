import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import pdfParse from 'pdf-parse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 Début test extraction");

  // 1️⃣ Lister les fichiers du bucket
  const { data: files, error: listError } = await supabase.storage
    .from('truthtalent')
    .list('', { limit: 10 });

  if (listError) {
    console.error("❌ Erreur listage:", listError);
    return res.status(500).json({ error: listError.message });
  }

  console.log(`📂 Fichiers trouvés: ${files.length}`, files);

  if (files.length === 0) {
    return res.status(200).json({ message: "Aucun fichier trouvé" });
  }

  // 2️⃣ Télécharger le premier fichier
  const fileName = files[0].name;
  console.log(`⬇ Téléchargement de: ${fileName}`);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('truthtalent')
    .download(fileName);

  if (downloadError) {
    console.error("❌ Erreur téléchargement:", downloadError);
    return res.status(500).json({ error: downloadError.message });
  }

  console.log("✅ Fichier téléchargé avec succès");

  // 3️⃣ Lire le contenu du PDF
  const buffer = await fileData.arrayBuffer();
  const pdfText = await pdfParse(Buffer.from(buffer));

  console.log("📄 Extrait PDF:", pdfText.text.slice(0, 200), "...");

  // 4️⃣ Simuler insertion dans candidats
  const { error: insertError } = await supabase
    .from('candidats')
    .insert({
      nom: "Test Nom",
      prenom: "Test Prénom",
      email: "test@example.com",
      competences: pdfText.text.slice(0, 200)
    });

  if (insertError) {
    console.error("❌ Erreur insertion DB:", insertError);
    return res.status(500).json({ error: insertError.message });
  }

  console.log("✅ Insertion en base OK");

  res.status(200).json({
    message: "Test terminé avec succès",
    fichier: fileName
  });
}
