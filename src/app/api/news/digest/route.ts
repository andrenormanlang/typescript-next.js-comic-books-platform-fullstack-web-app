import { NextResponse } from "next/server";

const DISPATCH_API = process.env.RETROPOP_DISPATCH_API_URL;

export async function GET() {
  if (!DISPATCH_API) {
    return NextResponse.json({ error: "RETROPOP_DISPATCH_API_URL is not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${DISPATCH_API}/news/digest`, {
      next: { revalidate: 1800 },
    });
    // Non-blocking: never break the news page if the digest is unavailable.
    if (!res.ok) {
      return NextResponse.json({ digest: null });
    }
    const data = await res.json();
    return NextResponse.json({ digest: data?.digest ?? null });
  } catch (err) {
    console.error("News digest fetch error:", err);
    return NextResponse.json({ digest: null });
  }
}
