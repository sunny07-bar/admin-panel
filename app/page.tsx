"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user role and redirect to appropriate dashboard
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .eq('is_active', true)
          .single();
        
        if (userData) {
          router.push(`/${userData.role}/dashboard`);
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }

    checkAuth();
  }, [router, supabase]);

  // Show loading state while checking auth
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
        
        {/* Animated gradient ring */}
        <div 
          className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
          style={{
            borderTopColor: '#465fff',
            borderRightColor: '#6b7fff',
            borderBottomColor: '#465fff',
            borderLeftColor: 'transparent',
            animationDuration: '1s',
          }}
        ></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse shadow-lg shadow-brand-500/50"></div>
        </div>
        
        {/* Glowing effect */}
        <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping"></div>
      </div>
    </div>
  );
}
