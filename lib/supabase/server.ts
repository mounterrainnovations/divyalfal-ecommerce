import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duwwgyobnpuqsqdromzj.supabase.co';
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
