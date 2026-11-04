import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  // `set`/`remove` replace `response` when Supabase refreshes the session, so
  // callers must read it AFTER auth calls; a value captured up front is stale
  // and would drop the refreshed auth cookies.
  return { supabase, getResponse: () => response };
};

export const updateSession = async (request: NextRequest) => {
  try {
    const { supabase, getResponse } = createClient(request);

    // Authenticates via Supabase Auth server — required for Server Components.
    // May refresh the session, which rewrites the auth cookies.
    const { data: { user } } = await supabase.auth.getUser();

    return { response: getResponse(), user };
  } catch (e) {
    return {
      response: NextResponse.next({ request: { headers: request.headers } }),
      user: null,
    };
  }
};
