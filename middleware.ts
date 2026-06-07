import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const publicPaths = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/confirm',
  '/auth/reset-password',
  '/auth/auth-error',
  '/api/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some(path =>
    path.endsWith('/')
      ? pathname === path || pathname.startsWith(path)
      : pathname === path
  );

  console.log(`Is public path: ${isPublicPath}`);

  if (isPublicPath) {
    const { response } = await updateSession(request);
    return response;
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    console.log('Middleware: Redirecting to:', redirectUrl.toString(), 'from:', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Any file with an extension (e.g. .svg, .png, .jpg, .ico, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
