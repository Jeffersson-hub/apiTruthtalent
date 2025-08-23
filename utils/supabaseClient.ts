// utils/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

/* const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing SUPABASE_ANON_KEY");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
}); */

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // ou ANON_KEY si public
);

const { data, error } = await supabase.storage.from('truthtalent').list();
if (error) console.error('Erreur bucket:', error);
else console.log('Fichiers trouvés:', data);