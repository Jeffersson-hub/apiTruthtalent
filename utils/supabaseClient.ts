// utils/supabaseClient.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
