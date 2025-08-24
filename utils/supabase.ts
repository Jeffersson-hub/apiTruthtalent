// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Variables SUPABASE_URL et SUPABASE_ANON_KEY manquantes !");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
