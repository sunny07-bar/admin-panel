"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GridShape from "@/components/common/GridShape";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user role and redirect
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .eq('is_active', true)
          .single();
        
        if (userData) {
          router.push(`/${userData.role}/dashboard`);
        }
      }
    }
    checkUser();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .eq('is_active', true)
          .single();

        if (userError || !userData) {
          setError("User account not found or inactive");
          setLoading(false);
          return;
        }

        // Redirect to role-specific dashboard
        const redirectTo = searchParams.get('redirect') || `/${userData.role}/dashboard`;
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      setLoading(false);
    }
  };

  return (
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          <div className="mb-6 text-center">
            <h2 className="text-title-md font-semibold text-gray-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="mt-2 text-theme-sm text-gray-600 dark:text-gray-400">
              Enter your credentials to access the admin panel
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <GridShape />
      <Suspense fallback={
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
            <div className="mb-6 text-center">
              <h2 className="text-title-md font-semibold text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-theme-sm text-gray-600 dark:text-gray-400">
                Loading...
              </p>
            </div>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
