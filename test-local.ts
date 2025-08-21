// test-local.ts
import dotenv from 'dotenv';
import path from 'path';
import { processCV } from './utils/parse'; // Chemin relatif correct

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);

const filePath = path.join(__dirname, './cv_it.pdf');
if (!fs.existsSync(filePath)) {
  console.error('Fichier non trouvé :', filePath);
  process.exit(1);
}

import fs from 'fs';
const fileBuffer = fs.readFileSync(filePath);

async function testLocal() {
  try {
    const result = await processCV(fileBuffer, 'cv_it.pdf');
    console.log('Succès ! ID du candidat :', result.candidatId);
  } catch (error) {
    console.error('Erreur :', error);
  }
}

testLocal();
