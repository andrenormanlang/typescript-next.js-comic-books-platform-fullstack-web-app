import { NextResponse } from "next/server";

const DISPATCH_API = process.env.RETROPOP_DISPATCH_API_URL;

const FEED_URLS = [
  "https://www.cbr.com/feed/",
  "https://bleedingcool.com/feed/",
  "https://www.comicsbeat.com/feed/",
  "https://icv2.com/rss",
  "https://aiptcomics.com/feed/",
  "https://www.comicbookherald.com/feed/",
  "https://www.graphicpolicy.com/feed/",
  "https://brokenfrontier.com/feed/",
  "https://13thdimension.com/feed/",
  "https://www.denofgeek.com/comics/feed/",
  "https://comicbook.com/category/comics/feed/",
  "https://www.comicsalliance.com/feed/",
];

export async function GET() {
  if (!DISPATCH_API) {
    return NextResponse.json({ error: "RETROPOP_DISPATCH_API_URL is not set" }, { status: 500 });
  }

  try {
    const feedResults = await Promise.all(
      FEED_URLS.map(async (rssUrl) => {
        const pathParam = encodeURIComponent(JSON.stringify({ rssUrl }));
        const res = await fetch(`${DISPATCH_API}/dispatch/${pathParam}`, {
          next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.items ?? [];
      })
    );

    const all: any[] = feedResults.flat();
    all.sort((a, b) => (b.pubTS ?? 0) - (a.pubTS ?? 0));
    const articles = all.slice(0, 400);

    return NextResponse.json(articles);
  } catch (err) {
    console.error("News trending fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
