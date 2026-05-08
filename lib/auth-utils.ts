import { createClient } from './supabase/server';
import { prisma } from './db';

/**
 * Checks if the current authenticated user has an ADMIN role.
 * Useful for server-side RBAC in API routes and Server Actions.
 */
export async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false };

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return {
    user,
    isAdmin: profile?.role === 'ADMIN',
  };
}

/**
 * Returns the current authenticated user.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
