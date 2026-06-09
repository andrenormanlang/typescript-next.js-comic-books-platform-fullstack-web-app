import { NextResponse } from "next/server";

const DISPATCH_API = process.env.RETROPOP_DISPATCH_API_URL;

const FEED_URLS = [
  "https://bleedingcool.com/feed/",
  "https://www.comicbookherald.com/feed/",
  "https://www.cbr.com/feed/",
  "https://www.comicsbeat.com/feed/",
  "https://icv2.com/articles/news/rss.xml",
  "https://aiptcomics.com/feed/",
  "https://www.multiversitycomics.com/feed/",
  "https://dccomicsnews.com/feed/",
  "https://www.gamesradar.com/comics/rss/",
  "https://www.superherohype.com/feed/",
  "https://comicbookroundup.com/feed/rss2/",
];

async function hasRwBody(articleUrl: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${DISPATCH_API}/smart/article/${encodeURIComponent(articleUrl)}?sortKey=articles`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.rwBody;
  } catch {
    return false;
  }
}

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
    const candidates = all.slice(0, 60);

    const checks = await Promise.all(candidates.map((item) => hasRwBody(item.id)));
    const articles = candidates.filter((_, i) => checks[i]).slice(0, 40);

    return NextResponse.json(articles);
  } catch (err) {
    console.error("News trending fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
