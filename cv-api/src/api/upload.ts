// /cv-api/src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import nextConnect from 'next-connect'
import multer from 'multer'
import Cors from 'cors'
import { supabase } from '@/lib/supabase'

// Middleware CORS
const cors = Cors({
  origin: 'https://truthtalent.online',
  methods: ['POST'],
})

// Middleware run
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      return result instanceof Error ? reject(result) : resolve(result)
    })
  })
}

// Config multer
const upload = multer({ storage: multer.memoryStorage() })

const apiRoute = nextConnect({
  onError(error, req: NextApiRequest, res: NextApiResponse) {
    res.status(501).json({ error: `Erreur : ${error.message}` })
  },
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Méthode ${req.method} non autorisée` })
  },
})

apiRoute.use(upload.single('file'))

apiRoute.post(async (req: any, res: NextApiResponse) => {
  await runMiddleware(req, res, cors)

  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' })
  }

  const filePath = `cvs/${Date.now()}_${file.originalname}`
  const { error } = await supabase.storage
    .from('truthtalent')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    })

  if (error) {
    return res.status(500).json({ error: 'Erreur lors de l\'upload vers Supabase', details: error.message })
  }

  return res.status(200).json({ success: true, path: filePath })
})

export default apiRoute

export const config = {
  api: {
    bodyParser: false, // important pour multer
  },
}
