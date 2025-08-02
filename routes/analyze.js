const express = require('express');
const multer = require('multer');
const { parseDocument } = require('../services/documentParser');
const { extractInfo } = require('../utils/extractInfo');

const upload = multer();
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni.' });
    }
    const text = await parseDocument(req.file.buffer, req.file.mimetype);
    const info = extractInfo(text);
    res.json({ text, info });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur côté serveur.' });
  }
});

module.exports = router;
