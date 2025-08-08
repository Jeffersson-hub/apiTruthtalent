// utils/supabase.ts
// import { createClient } from '../@supabase/supabase-js'
import { createClient } from '../node_modules/@supabase/supabase-js'

const supabaseUrl = 'https://venldvzkjzybpffrtkql.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '' // clé sécurisée dans .env.local

export const supabase = createClient(supabaseUrl, supabaseKey)
