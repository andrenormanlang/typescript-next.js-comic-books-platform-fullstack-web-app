import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "https://www.guiadosquadrinhos.com";
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const KEYWORD_CAPAS_ALIASES: Record<string, string> = {
	hulk: `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	"incrivel hulk": `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	"o incrivel hulk": `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	wolverine: `${BASE_URL}/capas/wolverine/wo00302`,
};

/**
 * Fetch HTML with optional ScraperAPI proxy. Includes simple retry + timeout.
 */
async function fetchHtml(url: string, retries = 3, timeoutMs = 30000): Promise<string> {
	const makeRequest = async (targetUrl: string, tms: number) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), tms);
		try {
			const res = await fetch(targetUrl, {
				method: "GET",
				headers: {
					Accept: "text/html,application/xhtml+xml",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Referer: BASE_URL,
				},
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return res;
		} finally {
			clearTimeout(timeoutId);
		}
	};

	let lastErr: any = null;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await makeRequest(url, timeoutMs);
			if (res.ok) return await res.text();

			const txt = await res.text().catch(() => "");
			lastErr = new Error(`Direct fetch failed ${res.status}: ${txt}`);

			if (res.status === 429 && attempt < retries) {
				const wait = Math.pow(2, attempt) * 1000;
				await new Promise((r) => setTimeout(r, wait));
				continue;
			}

			break;
		} catch (err) {
			lastErr = err;
			if (
				(err as any).name === "AbortError" ||
				(err as any).code === "ECONNRESET" ||
				(err as any).code === "ENOTFOUND"
			) {
				if (attempt < retries) {
					const wait = Math.pow(2, attempt) * 500;
					await new Promise((r) => setTimeout(r, wait));
					continue;
				}
			} else {
				break;
			}
		}
	}

	let proxyErr: unknown = null;
	if (SCRAPER_API_KEY && SCRAPER_API_KEY.length) {
		let proxy = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true&keep_headers=true`;
		proxy += "&country_code=BR";

		try {
			const pres = await makeRequest(proxy, Math.max(timeoutMs, 90000));
			if (pres.ok) return await pres.text();
			const ptxt = await pres.text().catch(() => "");
			throw new Error(`Proxy fetch failed ${pres.status}: ${ptxt}`);
		} catch (err) {
			proxyErr = err;
		}
	}

	try {
		const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
		const mirrorController = new AbortController();
		const mirrorTimeoutId = setTimeout(() => mirrorController.abort(), Math.max(timeoutMs, 60000));
		const mres = await (async () => {
			try {
				return await fetch(mirrorUrl, {
					method: "GET",
					headers: { Accept: "text/plain" },
					signal: mirrorController.signal,
				});
			} finally {
				clearTimeout(mirrorTimeoutId);
			}
		})();
		if (mres.ok) return await mres.text();
		const mtxt = await mres.text().catch(() => "");
		throw new Error(`Mirror fetch failed ${mres.status}: ${mtxt}`);
	} catch (mirrorErr) {
		const proxyMessage = proxyErr ? ` — Proxy error: ${(proxyErr as Error).message}` : "";
		throw new Error(
			`Direct fetch failed and no non-premium fallback succeeded. Direct error: ${lastErr?.message || lastErr}${proxyMessage} — Mirror error: ${(mirrorErr as Error).message}`,
		);
	}
}

async function fetchMirrorMarkdown(url: string, timeoutMs = 45000): Promise<string> {
	const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(mirrorUrl, {
			method: "GET",
			headers: { Accept: "text/plain" },
			signal: controller.signal,
		});
		if (!res.ok) {
			const txt = await res.text().catch(() => "");
			throw new Error(`Mirror fetch failed ${res.status}: ${txt}`);
		}
		return await res.text();
	} finally {
		clearTimeout(timeoutId);
	}
}

function getDirectCapasUrl(query?: string) {
	if (!query) return null;
	const trimmed = query.trim();
	if (!trimmed) return null;

	if (/^https?:\/\//i.test(trimmed)) {
		try {
			const parsed = new URL(trimmed);
			if (
				parsed.hostname.toLowerCase().includes("guiadosquadrinhos.com") &&
				parsed.pathname.includes("/capas/")
			) {
				return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
			}
		} catch {
			return null;
		}
	}

	if (trimmed.startsWith("/capas/")) {
		return `${BASE_URL}${trimmed}`.replace(/\/$/, "");
	}

	return null;
}

function getEditionCodeFromCapasUrl(capasUrl: string) {
	const match = capasUrl.match(/\/capas\/[^/]+\/([^/?#]+)/i);
	return match?.[1]?.toLowerCase() || "";
}

/**
 * Normalize a guiadosquadrinhos *page* URL — always http://.
 */
function normalizeGuiaUrl(rawUrl: string) {
	const value = (rawUrl || "").trim();
	if (!value) return "";

	return value
		.replace(/^http:\/\/wwww\./i, "http://www.")
		.replace(/^https:\/\/wwww\./i, "http://www.")
		.replace(/^https:\/\//i, "http://")
		.replace(/([^:]\/)\/+/g, "$1")
		.trim();
}

function toAbsoluteGuiaUrl(rawUrl: string): string {
	const value = (rawUrl || "").trim();
	if (!value) return "";

	if (/^https?:\/\//i.test(value)) return value;
	if (value.startsWith("//")) return `http:${value}`;
	if (value.startsWith("/")) return `${BASE_URL}${value}`;
	if (/^www\./i.test(value)) return `http://${value}`;
	return value;
}

/**
 * Normalize a guiadosquadrinhos *image/cover* URL — always http://.
 * The site's image server (capasthumbs, capastemp_thumbs) only listens on
 * port 80 and drops https connections with ERR_CONNECTION_RESET.
 */
function normalizeCoverUrl(rawUrl: string) {
	const value = (rawUrl || "").trim();
	if (!value) return "";

	return value
		.replace(/^https:\/\/wwww\./i, "http://www.")
		.replace(/^http:\/\/wwww\./i, "http://www.")
		.replace(/^https:\/\//i, "http://")
		.replace(/([^:]\/)\/+/g, "$1")
		.trim();
}

function normalizeText(value: string) {
	if (!value) return "";

	try {
		const fixed = Buffer.from(value, "latin1").toString("utf8");
		if (fixed.includes("�")) return value.trim();
		return fixed.trim();
	} catch {
		return value.trim();
	}
}

type GuiaTitleRow = {
	title: string;
	url: string;
	editora: string;
	issuesCount: number;
};

function parseTitleSearchRows(markdown: string): GuiaTitleRow[] {
	const rows: GuiaTitleRow[] = [];
	const seen = new Set<string>();
	const rowRegex =
		/\|\s*\[([^\]]+)\]\((https?:\/\/www\.guiadosquadrinhos\.com\/capas\/[^)\s]+)(?:\s+"[^"]*")?\)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;

	let match: RegExpExecArray | null;
	while ((match = rowRegex.exec(markdown)) !== null) {
		const title = normalizeText((match[1] || "").trim());
		const url = normalizeGuiaUrl((match[2] || "").trim());
		const editora = normalizeText((match[3] || "").trim());
		const issuesRaw = (match[6] || "").trim();
		const issuesCount = Number.parseInt(issuesRaw.match(/\d+/)?.[0] || "0", 10) || 0;
		if (!url || seen.has(url)) continue;
		seen.add(url);
		rows.push({ title, url, editora, issuesCount });
	}

	return rows;
}

function scoreTitleCandidate(row: GuiaTitleRow, normalizedQuery: string) {
	const title = row.title.toLowerCase();
	const url = row.url.toLowerCase();
	const editora = row.editora.toLowerCase();
	let score = 0;

	if (title === normalizedQuery) score += 40;
	if (title.includes(normalizedQuery)) score += 50;
	if (url.includes(normalizedQuery)) score += 20;
	if (editora.includes("abril")) score += 25;
	if (normalizedQuery.includes("hulk") && /incr[ií]vel\s+hulk/.test(title)) score += 40;
	if (normalizedQuery.includes("hulk") && editora.includes("abril") && title.includes("hulk")) score += 120;
	score += Math.min(row.issuesCount, 240) / 6;

	return score;
}

async function resolveCapasUrlFromKeyword(query: string): Promise<string | null> {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return null;

	const aliasCapas = KEYWORD_CAPAS_ALIASES[normalizedQuery];
	if (aliasCapas) return aliasCapas;

	try {
		const keywordUrl = `${BASE_URL}/titulos/${encodeURIComponent(normalizedQuery)}`;
		const markdown = await fetchMirrorMarkdown(keywordUrl, 60000);
		const rows = parseTitleSearchRows(markdown);
		if (!rows.length) return null;

		const directMatches = rows.filter((row) => {
			const title = row.title.toLowerCase();
			const url = row.url.toLowerCase();
			return title.includes(normalizedQuery) || url.includes(normalizedQuery);
		});

		const candidateRows = directMatches.length ? directMatches : rows;

		const scored = candidateRows
			.map((row) => ({ row, score: scoreTitleCandidate(row, normalizedQuery) }))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score);

		if (!scored.length) return null;

		let selected = scored[0];
		if (selected.row.issuesCount < 5) {
			const richer = scored.find(
				(item) =>
					item.row.issuesCount >= 8 &&
					(item.row.title.toLowerCase().includes(normalizedQuery) ||
						item.row.url.toLowerCase().includes(normalizedQuery)),
			);
			if (richer) selected = richer;
		}

		return selected.row.url;
	} catch {
		return null;
	}
}

function parseItensRange(content: string) {
	const match = content.match(/Itens:\s*(\d+)\s*-\s*(\d+)\s*de\s*(\d+)/i);
	if (!match) return null;

	const start = Number.parseInt(match[1], 10);
	const end = Number.parseInt(match[2], 10);
	const total = Number.parseInt(match[3], 10);
	if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(total)) return null;

	return { start, end, total };
}

function getCapasPageCandidates(capasUrl: string, page: number) {
	if (page <= 1) return [capasUrl];

	const normalized = capasUrl.replace(/\/$/, "");
	return [
		`${normalized}?pagina=${page}`,
		`${normalized}?page=${page}`,
		`${normalized}?pg=${page}`,
		`${normalized}/${page}`,
	];
}

async function resolveDirectCapasMarkdownPage(capasUrl: string, page: number) {
	const candidates = getCapasPageCandidates(capasUrl, page);
	const expectedPage = Math.max(1, page);

	for (const candidate of candidates) {
		const markdown = await fetchMirrorMarkdown(candidate);
		const range = parseItensRange(markdown);

		if (expectedPage === 1) {
			return { markdown, usedUrl: candidate, range };
		}

		if (range) {
			const pageSize = Math.max(1, range.end - range.start + 1);
			const expectedStart = (expectedPage - 1) * pageSize + 1;
			if (range.start === expectedStart) {
				return { markdown, usedUrl: candidate, range };
			}
		}
	}

	return null;
}

function parseGuiaMarkdownResults(markdown: string, query?: string, editionCode?: string) {
	const results: Array<any> = [];
	const seen = new Set<string>();
	const normalizedQuery = (query || "").toLowerCase();
	const normalizedEditionCode = (editionCode || "").toLowerCase();

	const imageLinkRegex = /\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
	let imgMatch: RegExpExecArray | null;
	while ((imgMatch = imageLinkRegex.exec(markdown)) !== null) {
		const rawTitle = normalizeText((imgMatch[1] || "").trim());
		const cover = normalizeCoverUrl(toAbsoluteGuiaUrl((imgMatch[2] || "").trim()));
		const href = normalizeGuiaUrl(toAbsoluteGuiaUrl((imgMatch[3] || "").trim()));
		if (!href || seen.has(href)) continue;
		if (!/guiadosquadrinhos\.com/i.test(href) || !/(?:\/capas\/|\/edicao\/)/i.test(href)) continue;
		if (normalizedEditionCode && !href.toLowerCase().includes(`/${normalizedEditionCode}/`)) continue;

		const title = normalizeText(rawTitle.replace(/^Image\s*\d+\s*:\s*/i, "").trim());
		const haystack = `${title} ${href}`.toLowerCase();
		if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;

		seen.add(href);
		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		results.push({
			title,
			url: href,
			cover,
			id,
			provider: "guiadosquadrinhos",
		});
	}

	const textLinkRegex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
	let txtMatch: RegExpExecArray | null;
	while ((txtMatch = textLinkRegex.exec(markdown)) !== null) {
		const title = normalizeText((txtMatch[1] || "").trim());
		const href = normalizeGuiaUrl(toAbsoluteGuiaUrl((txtMatch[2] || "").trim()));
		if (!href || seen.has(href)) continue;
		if (!/guiadosquadrinhos\.com/i.test(href) || !/(?:\/capas\/|\/edicao\/)/i.test(href)) continue;
		if (normalizedEditionCode && !href.toLowerCase().includes(`/${normalizedEditionCode}/`)) continue;

		const haystack = `${title} ${href}`.toLowerCase();
		if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;

		seen.add(href);
		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		results.push({
			title,
			url: href,
			cover: "",
			id,
			provider: "guiadosquadrinhos",
		});
	}

	return results;
}

async function computeDirectHasMore(
	capasUrl: string,
	page: number,
	range: { start: number; end: number; total: number } | null,
	fallback: boolean,
) {
	let hasMore = range ? range.end < range.total : fallback;
	if (!hasMore) return false;

	const nextPage = await resolveDirectCapasMarkdownPage(capasUrl, page + 1);
	return !!nextPage;
}

async function scrapeGuiaSearch(query?: string, page = 1) {
	const directCapasUrl = getDirectCapasUrl(query);
	if (directCapasUrl) {
		const resolvedPage = await resolveDirectCapasMarkdownPage(directCapasUrl, page);
		if (!resolvedPage) {
			return {
				results: [],
				pagination: { current_page: page, has_more: false, total_results: 0 },
				success: true,
				searched_url: directCapasUrl,
			};
		}

		const { markdown, usedUrl, range } = resolvedPage;
		const editionCode = getEditionCodeFromCapasUrl(directCapasUrl);
		const directResults = parseGuiaMarkdownResults(markdown, undefined, editionCode);
		const hasMore = await computeDirectHasMore(directCapasUrl, page, range, /__doPostBack/i.test(markdown));

		return {
			results: directResults,
			pagination: {
				current_page: page,
				has_more: hasMore,
				total_results: range?.total ?? directResults.length,
			},
			success: true,
			searched_url: usedUrl,
		};
	}

	if (query?.trim()) {
		const keywordCapasUrl = await resolveCapasUrlFromKeyword(query);
		if (keywordCapasUrl) {
			const resolvedPage = await resolveDirectCapasMarkdownPage(keywordCapasUrl, page);
			if (!resolvedPage) {
				return {
					results: [],
					pagination: { current_page: page, has_more: false, total_results: 0 },
					success: true,
					searched_url: keywordCapasUrl,
				};
			}

			const { markdown, usedUrl, range } = resolvedPage;
			const editionCode = getEditionCodeFromCapasUrl(keywordCapasUrl);
			const keywordResults = parseGuiaMarkdownResults(markdown, undefined, editionCode);
			const hasMore = await computeDirectHasMore(keywordCapasUrl, page, range, /__doPostBack/i.test(markdown));

			return {
				results: keywordResults,
				pagination: {
					current_page: page,
					has_more: hasMore,
					total_results: range?.total ?? keywordResults.length,
				},
				success: true,
				searched_url: usedUrl,
			};
		}
	}

	const q = query ? `?s=${encodeURIComponent(query)}` : "";
	const pageSegment = page > 1 ? `/page/${page}` : "";
	const url = `${BASE_URL}${pageSegment}/${q}`.replace(/([^:]\/)\/+/g, "$1");

	const html = await fetchHtml(url);
	const $ = cheerio.load(html);

	const seen = new Set<string>();
	const results: Array<any> = [];

	$('a[href*="/capas/"], a[href*="/edicao/"]').each((_, el) => {
		const $a = $(el);
		let href = $a.attr("href") || "";
		href = href.split("#")[0];
		if (!href.startsWith("http")) href = new URL(href, BASE_URL).toString();
		if (seen.has(href)) return;
		seen.add(href);

		let title = "";
		const $img = $a.find("img").first();
		if ($img.length) title = ($img.attr("alt") || "").trim();
		if (!title) title = $a.text().trim();
		if (!title) title = $a.attr("title") || "";

		let cover = "";
		if ($img.length) {
			cover = ($img.attr("data-src") || $img.attr("src") || "").trim();
			if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
			cover = normalizeCoverUrl(cover);
		} else {
			const $parentImg = $a.parent().find("img").first();
			if ($parentImg.length) {
				cover = ($parentImg.attr("data-src") || $parentImg.attr("src") || "").trim();
				if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
				cover = normalizeCoverUrl(cover);
			}
		}

		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		results.push({ title: title || "", url: href, cover, id, provider: "guiadosquadrinhos" });
	});

	if (results.length === 0) {
		$("article, .post, .entry").each((_, article) => {
			const $article = $(article);
			const $link = $article.find('a[href*="/capas/"]').first() || $article.find("a").first();
			if (!$link.length) return;

			let href = $link.attr("href") || "";
			href = href.split("#")[0];
			if (!href.startsWith("http")) href = new URL(href, BASE_URL).toString();
			if (seen.has(href)) return;
			seen.add(href);

			let title =
				$article.find("h1, h2, .entry-title").first().text().trim() ||
				$link.text().trim() ||
				$link.attr("title") ||
				"";
			let cover = $article.find("img").first().attr("src") || "";
			if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
			cover = normalizeCoverUrl(cover);

			const parts = href.split("/").filter(Boolean);
			const id = parts.length ? parts[parts.length - 1] : href;
			results.push({ title, url: href, cover, id, provider: "guiadosquadrinhos" });
		});
	}

	if (results.length === 0 && html.includes("Markdown Content:")) {
		results.push(...parseGuiaMarkdownResults(html, query));
	}

	const hasMore = $(".nav-links .next, .pagination .next").length > 0 || $('a[rel="next"]').length > 0;

	return {
		results,
		pagination: { current_page: page, has_more: hasMore, total_results: results.length },
		success: true,
		searched_url: url,
	};
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const query = url.searchParams.get("query") || undefined;
	const page = parseInt(url.searchParams.get("page") || "1", 10);
	const useFixture = url.searchParams.get("fixture") === "1";

	if (page < 1) {
		return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
	}

	try {
		let results: any[] = [];
		let hasMore = false;
		let totalResults = 0;
		let pageSize = 0;

		if (useFixture) {
			const fixturePath = path.join(process.cwd(), "src", "app", "api", "guia-search", "fixtures", "hulk.html");
			const html = await fs.readFile(fixturePath, "utf8");
			const $ = cheerio.load(html);
			const seen = new Set<string>();

			$('a[href*="/capas/"], a[href*="/edicao/"]').each((_, el) => {
				const $a = $(el);
				let href = $a.attr("href") || "";
				href = href.split("#")[0];
				if (!href.startsWith("http")) href = new URL(href, BASE_URL).toString();
				if (seen.has(href)) return;
				seen.add(href);

				let title = "";
				const $img = $a.find("img").first();
				if ($img.length) title = ($img.attr("alt") || "").trim();
				if (!title) title = $a.text().trim();
				if (!title) title = $a.attr("title") || "";

				let cover = "";
				if ($img.length) {
					cover = ($img.attr("data-src") || $img.attr("src") || "").trim();
					if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
					cover = normalizeCoverUrl(cover);
				} else {
					const $parentImg = $a.parent().find("img").first();
					if ($parentImg.length) {
						cover = ($parentImg.attr("data-src") || $parentImg.attr("src") || "").trim();
						if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
						cover = normalizeCoverUrl(cover);
					}
				}

				const parts = href.split("/").filter(Boolean);
				const id = parts.length ? parts[parts.length - 1] : href;
				results.push({ title: title || "", url: href, cover, id, provider: "guiadosquadrinhos" });
			});

			if (results.length === 0) {
				$("article, .post, .entry").each((_, article) => {
					const $article = $(article);
					const $link = $article.find('a[href*="/capas/"]').first() || $article.find("a").first();
					if (!$link.length) return;

					let href = $link.attr("href") || "";
					href = href.split("#")[0];
					if (!href.startsWith("http")) href = new URL(href, BASE_URL).toString();
					if (seen.has(href)) return;
					seen.add(href);

					let title =
						$article.find("h1, h2, .entry-title").first().text().trim() ||
						$link.text().trim() ||
						$link.attr("title") ||
						"";
					let cover = $article.find("img").first().attr("src") || "";
					if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
					cover = normalizeCoverUrl(cover);

					const parts = href.split("/").filter(Boolean);
					const id = parts.length ? parts[parts.length - 1] : href;
					results.push({ title, url: href, cover, id, provider: "guiadosquadrinhos" });
				});
			}

			hasMore = $(".nav-links .next, .pagination .next").length > 0 || $('a[rel="next"]').length > 0;
			totalResults = results.length;
			pageSize = results.length;
		} else {
			const data = (await Promise.race([
				scrapeGuiaSearch(query, page),
				new Promise((_, reject) => setTimeout(() => reject(new Error("Scraping operation timed out")), 60000)),
			])) as any;
			results = data.results || [];
			hasMore = data.pagination?.has_more || false;
			totalResults = data.pagination?.total_results || results.length;
			pageSize = results.length;
		}

		return NextResponse.json(results, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
				"X-Guia-Has-More": String(!!hasMore),
				"X-Guia-Total-Results": String(totalResults || 0),
				"X-Guia-Page-Size": String(pageSize || 0),
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Guia search error:", message, err);

		return NextResponse.json(
			{ error: "Failed to fetch guia dos quadrinhos", message, success: false },
			{ status: 500 },
		);
	}
}

export const runtime = "nodejs";
