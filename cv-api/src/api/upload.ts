import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import Cors from 'cors';
// import { supabase } from '../../../old/supabase';

// Middleware CORS
const cors = Cors({
  origin: 'https://truthtalent.online',
  methods: ['POST'],
});

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, next: (err?: unknown) => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve();
    });
  });
}

const upload = multer({ storage: multer.memoryStorage() });

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error: Error, _req, res) {
    res.status(501).json({ error: `Erreur : ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  },
});

apiRoute.use(upload.single('file'));

apiRoute.post(async (req: NextApiRequest & { file?: Express.Multer.File }, res) => {
  await runMiddleware(req, res, cors);

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  const filePath = `cvs/${Date.now()}_${req.file.originalname}`;
  /* const { error } = await supabase.storage
    .from('truthtalent')
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    return res.status(500).json({ error: 'Erreur lors de l\'upload vers Supabase', details: error.message });
  } */

  res.status(200).json({ success: true, path: filePath });
});

export default apiRoute;

export const config = {
  api: { bodyParser: false },
};
