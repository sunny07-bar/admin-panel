import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager';
  is_active: boolean;
}

/**
 * Get the current authenticated user with role information
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    return null;
  }

  // Get user role from public.users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active')
    .eq('id', authUser.id)
    .eq('is_active', true)
    .single();

  if (userError || !userData) {
    return null;
  }

  return {
    id: userData.id,
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role as 'admin' | 'manager',
    is_active: userData.is_active,
  };
}

/**
 * Require authentication and return the current user
 * Redirects to login if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

/**
 * Require admin role
 * Redirects to appropriate dashboard if not admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  
  if (user.role !== 'admin') {
    redirect(`/${user.role}/dashboard`);
  }
  
  return user;
}

/**
 * Require manager role
 * Redirects to appropriate dashboard if not manager
 */
export async function requireManager(): Promise<User> {
  const user = await requireAuth();
  
  if (user.role !== 'manager') {
    redirect(`/${user.role}/dashboard`);
  }
  
  return user;
}

/**
 * Check if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || false;
}

