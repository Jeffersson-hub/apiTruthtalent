// test-local.ts
import { processCV } from './pages/api/parse';
import fs from 'fs';
import path from 'path';
// test-local.ts
import dotenv from 'dotenv';
dotenv.config();

console.log('SUPABASE_URL:', process.env.SUPABASE_URL); // Doit afficher ton URL
console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY); // Doit afficher "true"


// 1. Chemin vers un fichier CV local (remplace par ton fichier)
const filePath = path.join(__dirname, './CV_Industrie_IT.pdf');
const fileBuffer = fs.readFileSync(filePath);
const fileName = 'CV_Industrie_IT.pdf';

// 2. Appel de la fonction principale
async function testLocal() {
  try {
    console.log('⏳ Début du test local...');
    const result = await processCV(fileBuffer, fileName);

    if (result.success) {
      console.log('✅ Succès !');
      console.log('- ID du candidat inséré :', result.candidatId);
    } else {
      console.error('❌ Échec :', result.error?.message);
    }
  } catch (error) {
    console.error('💥 Erreur inattendue :', error);
  }
}

// 3. Lancer le test
testLocal();
