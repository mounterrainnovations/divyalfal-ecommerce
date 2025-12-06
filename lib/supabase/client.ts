import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duwwgyobnpuqsqdromzj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_ANON_KEY || process.env.ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
