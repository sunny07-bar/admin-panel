import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

const isApiRoute = createRouteMatcher([
  '/api(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // For API routes, just ensure auth is available (don't redirect)
  if (isApiRoute(request)) {
    // Auth will be checked in the API route itself
    return
  }
  
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * 
     * Note: API routes are now included so auth() works in API routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
