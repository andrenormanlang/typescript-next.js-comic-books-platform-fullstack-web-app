import { NextResponse } from "next/server";

const DISPATCH_API = process.env.RETROPOP_DISPATCH_API_URL;

export async function GET() {
  if (!DISPATCH_API) {
    return NextResponse.json({ error: "RETROPOP_DISPATCH_API_URL is not set" }, { status: 500 });
  }

  // Hard cap so this route can never hang the serverless function (the backend read is a fast
  // DynamoDB lookup; anything slower means it's unavailable → degrade to no digest).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${DISPATCH_API}/news/digest`, {
      next: { revalidate: 1800 },
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}
