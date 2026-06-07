import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`);
    }
  }

  // URL to redirect to after sign in process completes
//   Based on sign up process, redirect to account page

  return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`);
}
