'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager';
  is_active: boolean;
}

/**
 * Get the current authenticated user (client-side)
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  
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
 * Hook to get current user
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    }

    fetchUser();
  }, []);

  return { user, loading };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

