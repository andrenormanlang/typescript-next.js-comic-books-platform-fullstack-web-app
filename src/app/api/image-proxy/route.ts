import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = ["www.guiadosquadrinhos.com", "guiadosquadrinhos.com"];

/**
 * Normalize a guiadosquadrinhos image URL to always use http://.
 * The site's image server only listens on port 80, not 443.
 */
function toHttpImageUrl(url: string): string {
	return url.replace(/^https:\/\//i, "http://");
}

async function timedFetch(url: string, timeoutMs: number, headers: Record<string, string>): Promise<Response> {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { headers, signal: controller.signal });
	} finally {
		clearTimeout(id);
	}
}

function detectImageMime(buf: Uint8Array): string | null {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
	if (
		buf.length >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	)
		return "image/png";
	if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
	if (
		buf.length >= 12 &&
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	)
		return "image/webp";
	if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
	if (
		buf.length >= 12 &&
		buf[4] === 0x66 &&
		buf[5] === 0x74 &&
		buf[6] === 0x79 &&
		buf[7] === 0x70 &&
		((buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x66) ||
			(buf[8] === 0x68 && buf[9] === 0x65 && buf[10] === 0x69 && buf[11] === 0x63) ||
			(buf[8] === 0x68 && buf[9] === 0x65 && buf[10] === 0x69 && buf[11] === 0x66))
	)
		return "image/avif";

	return null;
}

function looksLikeHtmlPayload(buf: Uint8Array): boolean {
	if (buf.length < 16) return false;
	const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 512)).toLowerCase();
	return (
		head.includes("<html") || head.includes("<!doctype html") || head.includes("<body") || head.includes("<script")
	);
}

function isSvgPayload(buf: Uint8Array): boolean {
	const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 256)).trim().toLowerCase();
	return head.startsWith("<svg") || head.includes("<svg ");
}

function isSinglePixelGif(buf: Uint8Array): boolean {
	if (buf.byteLength !== 43) return false;
	return (
		buf[0] === 0x47 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x38 &&
		buf[4] === 0x39 &&
		buf[5] === 0x61 &&
		buf[6] === 0x01 &&
		buf[7] === 0x00 &&
		buf[8] === 0x01 &&
		buf[9] === 0x00
	);
}

async function buildImageResponse(res: Response): Promise<NextResponse | null> {
	const headerCt = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
	const arr = await res.arrayBuffer();
	const buf = new Uint8Array(arr);

	if (buf.byteLength < 32 || looksLikeHtmlPayload(buf) || isSinglePixelGif(buf)) return null;

	const detectedMime = detectImageMime(buf);
	const isSvg = headerCt === "image/svg+xml" || isSvgPayload(buf);
	const hasImageHeader = headerCt.startsWith("image/") || headerCt === "application/octet-stream";

	if (!detectedMime && !isSvg && !hasImageHeader) return null;

	const finalCt = isSvg ? "image/svg+xml" : detectedMime || (hasImageHeader ? headerCt : "image/jpeg");
	return new NextResponse(arr, {
		status: 200,
		headers: {
			"Content-Type": finalCt,
			"Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const rawImageUrl = searchParams.get("url");

	if (!rawImageUrl) {
		return new NextResponse("Missing url parameter", { status: 400 });
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(rawImageUrl);
	} catch {
		return new NextResponse("Invalid url parameter", { status: 400 });
	}

	if (!ALLOWED_HOSTNAMES.includes(parsedUrl.hostname.toLowerCase())) {
		return new NextResponse("URL not allowed", { status: 403 });
	}

	// Always use http:// — the site's image server doesn't support https
	const imageUrl = toHttpImageUrl(rawImageUrl);

	const imageHeaders = {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		Referer: "http://www.guiadosquadrinhos.com",
		Accept: "image/jpeg,image/png,image/gif,image/*,*/*;q=0.8",
	};

	// ─── Strategy 1: Direct http:// fetch ─────────────────────────────────────
	try {
		const res = await timedFetch(imageUrl, 6000, imageHeaders);
		if (res.ok) {
			const imageResponse = await buildImageResponse(res);
			if (imageResponse) return imageResponse;
			console.warn(`[image-proxy] Direct fetch returned non-image payload for ${imageUrl}`);
		}
		console.warn(`[image-proxy] Direct fetch: ${res.status} ${res.statusText} for ${imageUrl}`);
	} catch (err) {
		console.warn("[image-proxy] Direct fetch failed:", (err as Error).message, "url:", imageUrl);
	}

	// ─── Strategy 2: ScraperAPI (no render, plain http fetch) ─────────────────
	const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
	if (SCRAPER_API_KEY?.length) {
		// Use http:// URL with ScraperAPI — pass it as-is since we've already normalized
		const scraperUrl =
			`https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}` +
			`&url=${encodeURIComponent(imageUrl)}&country_code=BR`;
		try {
			const res = await timedFetch(scraperUrl, 12000, imageHeaders);
			if (res.ok) {
				const imageResponse = await buildImageResponse(res);
				if (imageResponse) return imageResponse;
				console.warn(`[image-proxy] ScraperAPI returned non-image payload for ${imageUrl}`);
			}
			console.warn(`[image-proxy] ScraperAPI: ${res.status} for ${imageUrl}`);
		} catch (err) {
			console.warn("[image-proxy] ScraperAPI failed:", (err as Error).message);
		}
	}

	// ─── Strategy 3: Jina reader ──────────────────────────────────────────────
	try {
		const jinaUrl = `https://r.jina.ai/${imageUrl}`;
		const res = await timedFetch(jinaUrl, 12000, {
			Accept: "image/*,*/*;q=0.8",
			"X-Return-Format": "raw",
		});
		if (res.ok) {
			const imageResponse = await buildImageResponse(res);
			if (imageResponse) return imageResponse;
			console.warn(`[image-proxy] Jina returned non-image payload for ${jinaUrl}`);
		}
		console.warn(`[image-proxy] Jina: ${res.status} for ${jinaUrl}`);
	} catch (err) {
		console.warn("[image-proxy] Jina failed:", (err as Error).message);
	}

	// ─── Strategy 4: weserv relay (good for anti-hotlink placeholders) ──────
	try {
		const relayUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl.replace(/^https?:\/\//i, ""))}`;
		const res = await timedFetch(relayUrl, 12000, {
			Accept: "image/*,*/*;q=0.8",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		});
		if (res.ok) {
			const imageResponse = await buildImageResponse(res);
			if (imageResponse) return imageResponse;
			console.warn(`[image-proxy] weserv returned non-image payload for ${relayUrl}`);
		}
		console.warn(`[image-proxy] weserv: ${res.status} for ${relayUrl}`);
	} catch (err) {
		console.warn("[image-proxy] weserv failed:", (err as Error).message);
	}

	// ─── All strategies exhausted → 404 ───────────────────────────────────────
	// Frontend onError will show placeholder immediately — no browser spinners.
	return new NextResponse("Image unavailable", {
		status: 404,
		headers: { "Cache-Control": "no-store" },
	});
}

export const runtime = "nodejs";
