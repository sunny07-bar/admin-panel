import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access login, redirect to dashboard
  if (user && pathname === '/login') {
    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (userData) {
      const url = request.nextUrl.clone();
      url.pathname = `/${userData.role}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // Role-based route protection
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (userData) {
      const userRole = userData.role;
      const isAdminRoute = pathname.startsWith('/admin');
      const isManagerRoute = pathname.startsWith('/manager');

      // Redirect admin to admin routes if accessing manager routes
      if (userRole === 'admin' && isManagerRoute && pathname !== '/manager') {
        const url = request.nextUrl.clone();
        url.pathname = pathname.replace('/manager', '/admin');
        return NextResponse.redirect(url);
      }

      // Redirect manager to manager routes if accessing admin routes
      if (userRole === 'manager' && isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.replace('/admin', '/manager');
        return NextResponse.redirect(url);
      }

      // Ensure users access their role-specific routes
      if (!isAdminRoute && !isManagerRoute && pathname !== '/') {
        // If accessing old routes, redirect to role-specific route
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/events') || pathname.startsWith('/reservations')) {
          const url = request.nextUrl.clone();
          url.pathname = `/${userRole}${pathname}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
