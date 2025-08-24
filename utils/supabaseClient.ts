import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function listCVs() {
  const { data, error } = await supabase.storage.from("truthtalent").list();
  if (error) throw error;
  return data;
}
