const express = require('express');
const router = express.Router();
const axios = require('axios');
const documentParser = require('../services/documentParser');
const { extractInfo } = require('../utils/extractCVData');
const { supabase } = require('../old/supabaseClient');

router.post('/', async (req, res) => {
  try {
    const files = req.body.files;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Aucune URL de fichier fournie.' });
    }

    const results = [];

    for (const fileUrl of files) {
      try {
        const { fileUrl } = req.body;
        if (!fileUrl) return res.status(400).json({ error: 'fileUrl manquant' });
        // 1. Télécharger le fichier depuis Supabase Storage
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // 2. Parser le texte brut
        const rawText = await documentParser.parseBuffer(buffer);

        // 3. Extraire les données utiles
        const extractedData = extractInfo(rawText);

        // 4. Ajouter l’URL du fichier dans les données
        extractedData.file_url = fileUrl;

        // 5. Insérer dans Supabase
        const { data: insertData, error } = await supabase
          .from('cvs')
          .insert([extractedData]);

        if (error) {
          results.push({ fileUrl, error: error.message });
        } else {
          results.push({ fileUrl, success: true, data });
        }

      } catch (err) {
        results.push({ fileUrl, error: err.message });
      }
    }

    res.json({ success: true, results, data: insertData });

  } catch (err) {
    console.error('Erreur API analyse:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
