// utils/supabase.ts
// import { createClient } from '@supabase/supabase-js/src';
import { createClient } from '../node_modules/@supabase/supabase-js/src'

const supabaseUrl = 'https://venldvzkjzybpffrtkql.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // dans .env.local

export const supabase = createClient(supabaseUrl, supabaseKey);

