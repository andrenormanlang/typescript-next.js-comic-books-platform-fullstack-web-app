// Shared text helpers for the comics news feed (used by both the card grid and the article modal).

/** Decode HTML entities (e.g. &#8230; → "…", &#8217; → "'") that RSS feeds leave encoded. */
export function decodeEntities(text: string): string {
  if (typeof document === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

/** Strip HTML tags, collapse whitespace, and decode entities. */
export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return decodeEntities(withoutTags);
}

/** First <img> src found in an HTML string, or null. */
export function extractImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

/** Hostname label for an RSS/source URL (leading "www." stripped). */
export function sourceLabel(rssUrl: string): string {
  try {
    return new URL(rssUrl).hostname.replace(/^www\./, "");
  } catch {
    return rssUrl;
  }
}
