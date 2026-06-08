import { NextRequest, NextResponse } from "next/server";

const DISPATCH_API = process.env.RETROPOP_DISPATCH_API_URL;

export async function GET(request: NextRequest) {
  if (!DISPATCH_API) {
    return NextResponse.json({ error: "RETROPOP_DISPATCH_API_URL is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DISPATCH_API}/smart/article/${encodeURIComponent(url)}?sortKey=articles`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch article" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Article detail fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}
