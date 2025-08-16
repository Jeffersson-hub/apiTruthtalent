import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabase';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { fileTypeFromBuffer } from 'file-type/core';
import { extractCVData } from '../../utils/extractCVData';


// Configurer le bodyParser pour accepter les requêtes JSON
export const config = {
  api: {
    bodyParser: true,
    sizeLimit: '10mb', // Limite la taille des requêtes
  },
};

// Types pour les résultats et les données extraites
interface FileResult {
  file: string;
  status: 'OK' | 'ERROR';
  data?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Autoriser les requêtes depuis votre domaine WordPress
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gérer les requêtes OPTIONS (préflight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni ou format invalide' });
    }

    // Traitement séquentiel pour éviter de surcharger Supabase
    const results: FileResult[] = [];

    for (const fileUrl of files) {
      try {
        console.log('Analyse du fichier:', fileUrl);

        // 1. Vérifier que l'URL est valide et provient de votre bucket
        const path = fileUrl.split('/').pop();
        if (!path) {
          results.push({ file: fileUrl, status: 'ERROR', error: 'Chemin de fichier invalide' });
          continue;
        }

        // 2. Télécharger le fichier
        const { data, error: dlError } = await supabase.storage
          .from('truthtalent')
          .download(path);

        if (dlError || !data) {
          console.error(`Erreur téléchargement (${path}):`, dlError);
          results.push({ file: path, status: 'ERROR', error: dlError?.message || 'Téléchargement échoué' });
          continue;
        }

        const buffer = Buffer.from(await data.arrayBuffer());

        // 3. Détecter le type MIME
        const type = await fileTypeFromBuffer(buffer);
        const mime = type?.mime || 'application/octet-stream';
        console.log(`Type détecté (${path}): ${mime}`);

        // 4. Extraire le texte selon le type MIME
        let text = '';
        try {
          if (mime === 'application/pdf') {
            const pdfData = await pdf(buffer);
            text = pdfData.text;
          } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const docxData = await mammoth.extractRawText({ buffer });
            text = docxData.value;
          } else if (mime === 'text/plain') {
            text = buffer.toString('utf-8');
          } else {
            console.warn(`Format non supporté (${path}): ${mime}`);
            results.push({ file: path, status: 'ERROR', error: 'Format non supporté' });
            continue;
          }
        } catch (extractError: any) {
          console.error(`Erreur extraction texte (${path}):`, extractError);
          results.push({ file: path, status: 'ERROR', error: extractError.message });
          continue;
        }

          if (!text || text.trim().length === 0) {
            console.warn(`Texte vide pour le fichier ${path}`);
            results.push({ file: path, status: 'ERROR', error: 'Texte extrait vide' });
            continue;
          }


        // 6. Insérer en base
        const { error: insertError } = await supabase
          .from('candidats')
          .insert([extractCVData]);

        if (insertError) {
          console.error(`Erreur insertion (${path}):`, insertError);
          results.push({ file: path, status: 'ERROR', error: insertError.message });
          continue;
        }

        results.push({ file: path, status: 'OK', data: extractCVData });

      } catch (fileError: any) {
        console.error(`Erreur traitement fichier (${fileUrl}):`, fileError);
        results.push({ file: fileUrl, status: 'ERROR', error: fileError.message });
      }
    }

    // Retourner les résultats
    return res.status(200).json({
      success: true,
      results,
      stats: {
        total: files.length,
        success: results.filter(r => r.status === 'OK').length,
        errors: results.filter(r => r.status === 'ERROR').length,
      },
    });

  } catch (error: any) {
    console.error('Erreur globale dans parse.ts:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur', details: error.message });
  }
}
