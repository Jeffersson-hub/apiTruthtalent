// api/process-cv.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { processCV } from '../../utils/parse';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, bucketName } = req.body;

    if (!fileName || !bucketName) {
      return res.status(400).json({ error: 'fileName and bucketName are required' });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(`cvs/${fileName}`);

    if (downloadError || !fileData) {
      return res.status(500).json({ error: `Failed to download file: ${downloadError?.message}` });
    }

    const fileBuffer = Uint8Array.from(await fileData.arrayBuffer());
    const result = await processCV(fileBuffer, fileName);

    if (!result.success) {
      return res.status(500).json({ error: result.error?.message });
    }

    return res.status(200).json({ success: true, candidatId: result.candidatId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
