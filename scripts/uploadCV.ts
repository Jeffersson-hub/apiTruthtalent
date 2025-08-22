import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { supabase } from "../utils/supabase";
import { Candidat } from "../types/candidats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const filePath = path.join(__dirname, "../cvs/mon-cv.pdf");
  const fileBuffer = await readFile(filePath);

  const { data, error } = await supabase.storage
    .from("truthtalent")
    .upload(`cvs/${Date.now()}-cv.pdf`, fileBuffer, {
      contentType: "application/pdf"
    });

  if (error) {
    console.error("❌ Erreur upload:", error.message);
  } else {
    console.log("✅ Fichier uploadé:", data);
  }
}

main().catch(console.error);
