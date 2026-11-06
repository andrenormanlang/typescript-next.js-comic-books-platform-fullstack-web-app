import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { CURRENCY_COOKIE, currencyForCountry, isCurrency } from "@/lib/currency";

// Paths that require auth, with a message shown on the login page
const protectedPaths: { path: string; message: string }[] = [
  { path: '/comics-store/sell', message: 'Sign in to list your comics for sale.' },
  { path: '/comics-store/edit', message: 'Sign in to edit your listing.' },
  { path: '/blog/create',       message: 'Sign in to write a blog post.' },
  { path: '/blog/edit',         message: 'Sign in to edit your blog post.' },
  { path: '/auth/account',      message: 'Sign in to access your account.' },
  { path: '/comics-store/wishlist', message: 'Sign in to see your wishlist.' },
];

// Forum write routes matched by pattern
const protectedPatterns: { pattern: RegExp; message: string }[] = [
  {
    pattern: /^\/forums\/[^/]+\/create-topic/,
    message: 'Sign in to create a forum topic.',
  },
  {
    pattern: /^\/forums\/[^/]+\/topics\/[^/]+\/create-post/,
    message: 'Sign in to post in this thread.',
  },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, user } = await updateSession(request);

  const matchedPath = protectedPaths.find(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );
  const matchedPattern = protectedPatterns.find(({ pattern }) => pattern.test(pathname));
  const matched = matchedPath ?? matchedPattern;

  if (matched && !user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    redirectUrl.searchParams.set('message', matched.message);
    return NextResponse.redirect(redirectUrl);
  }

  // First visit: guess the buyer's currency from their country. Vercel sends
  // x-vercel-ip-country, Cloudflare cf-ipcountry. The navbar switcher overrides it.
  if (!isCurrency(request.cookies.get(CURRENCY_COOKIE)?.value)) {
    const country = request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry');
    response.cookies.set(CURRENCY_COOKIE, currencyForCountry(country), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
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
