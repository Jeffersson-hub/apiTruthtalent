import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function extractCVData(fileUrl: string) {
  const { data, error } = await supabase.storage.from('ton-bucket').download(fileUrl);
  if (error || !data) throw new Error('Fichier introuvable');

  const buffer = await data.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  let text = '';

  if (fileUrl.endsWith('.pdf')) {
    const result = await pdfParse(uint8);
    text = result.text;
  } else if (fileUrl.endsWith('.docx')) {
    const bufferNode = Buffer.from(uint8); // ✅ FIX ICI
    const result = await mammoth.extractRawText({ buffer: bufferNode });
    text = result.value;
  } else {
    throw new Error('Format non supporté');
  }

  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)?.[0] || '';
  const phone = text.match(/(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}/)?.[0] || '';

  return { email, phone, rawText: text };
}
