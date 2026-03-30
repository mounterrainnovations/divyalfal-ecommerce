import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase configuration error: Missing URL or Anon Key for createServerClient.');
  }

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseAdminUrl || !supabaseAdminKey) {
  // We only log this instead of throwing as it's only needed for admin operations
  console.warn('Supabase Admin environment variables missing. Admin client will not be initialized.');
}

export const supabaseAdmin = (supabaseAdminUrl && supabaseAdminKey) 
  ? createSupabaseClient(
    supabaseAdminUrl,
    supabaseAdminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  ) : null as any; // Cast for now, safer checks should be at usage point

