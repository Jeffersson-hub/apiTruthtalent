// test-local.js
require('dotenv').config({ path: './.env' });
const { processCV } = require('./utils/parse'); // Chemin vers le fichier compilé
const fs = require('fs');
const path = require('path');

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);

const filePath = path.join(__dirname, './CV Industrie_IT.pdf');
if (!fs.existsSync(filePath)) {
  console.error('Fichier non trouvé :', filePath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);

async function testLocal() {
  try {
    const result = await processCV(fileBuffer, 'CV Industrie_IT.pdf');
    console.log('Succès ! ID du candidat :', result.candidatId);
  } catch (error) {
    console.error('Erreur :', error);
  }
}

testLocal();
