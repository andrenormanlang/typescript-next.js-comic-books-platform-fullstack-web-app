import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "http://www.guiadosquadrinhos.com";
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const KEYWORD_CAPAS_ALIASES: Record<string, string> = {
	hulk: `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	"incrivel hulk": `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	"o incrivel hulk": `${BASE_URL}/capas/incrivel-hulk-o/hk00301`,
	"capitao america": `${BASE_URL}/capas/capitao-america/ca00301`,
	"homem aranha": `${BASE_URL}/capas/homem-aranha-1-serie/ha00401`,
	"homem-aranha": `${BASE_URL}/capas/homem-aranha-1-serie/ha00401`,
	"o homem aranha": `${BASE_URL}/capas/homem-aranha-1-serie/ha00401`,
	"herois da tv": `${BASE_URL}/capas/herois-da-tv-2-serie/htv0302`,
	"herois-da-tv": `${BASE_URL}/capas/herois-da-tv-2-serie/htv0302`,
	"herois da tv 2 serie": `${BASE_URL}/capas/herois-da-tv-2-serie/htv0302`,
	"herois da tv - 2 serie": `${BASE_URL}/capas/herois-da-tv-2-serie/htv0302`,
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

async function fetchMirrorMarkdown(url: string, timeoutMs = 18000): Promise<string> {
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
				(parsed.pathname.includes("/capas/") || parsed.pathname.includes("/edicao/"))
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

	if (trimmed.startsWith("/edicao/")) {
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

function extractIssueMetaFromTitle(rawTitle: string) {
	const normalized = normalizeText(rawTitle || "")
		.replace(/&nbsp;|\u00a0/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
	const match = normalized.match(/n[°º]?\s*(\d+)\s*(.*)$/i);
	const releaseDateMatch = normalized.match(
		/(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}/i,
	);
	const releaseMonthOnlyMatch = normalized.match(
		/-?\s*(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
	);
	const releaseDate = releaseDateMatch
		? releaseDateMatch[0].toLowerCase()
		: releaseMonthOnlyMatch
			? releaseMonthOnlyMatch[1].toLowerCase()
			: "";

	return {
		editionNumber: match ? `#${match[1]}` : "",
		releaseDate,
	};
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

function normalizeForComparison(value: string): string {
	return (value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function parseTitlePublisherQuery(query: string) {
	const normalized = query.trim();
	const parts = normalized
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length >= 2) {
		return {
			title: parts[0],
			publisher: parts.slice(1).join(" / "),
		};
	}

	return { title: normalized, publisher: "" };
}

function splitTitleAndEdition(raw: string) {
	const value = (raw || "").trim();
	if (!value) return { title: "", edition: "" };

	// Match forms like: "homem aranha 1", "homem aranha #1", "homem aranha n°1", "homem aranha nº 1"
	const m = value.match(/^(.*?)[\s,:-]*(?:n[°º]?|no|n)?\.?\s*#?(\d+)\s*$/i);
	if (m) {
		return { title: m[1].trim(), edition: m[2].trim() };
	}

	return { title: value, edition: "" };
}

function matchesEdition(item: any, editionRequested: string) {
	if (!editionRequested) return false;
	const want = (editionRequested || "").replace(/^0+/, "").trim();
	if (!want) return false;

	// Check explicit extracted editionNumber (#1)
	const edNum = (item.editionNumber || "").replace(/[^0-9]/g, "");
	if (edNum && edNum === want) return true;

	// Check title for common patterns ("n° 1", "#1", or just "1")
	if (item.title) {
		const t = (item.title || "").toString();
		const m = t.match(/(?:n[°º]?\s*|no\s*|n\s*|#)?(\d+)\b/i);
		if (m && m[1] && m[1].replace(/^0+/, "") === want) return true;
		// also accept title that is just the number
		const just = t.trim();
		if (/^\d+$/.test(just) && just.replace(/^0+/, "") === want) return true;
	}

	// Check url path for -n-<num> or patterns like 'homem-aranha-n-3'
	if (item.url) {
		const u = (item.url || "").toString();
		const mu = u.match(/-n-?(\d+)\b/i) || u.match(/n[°º]?-?(\d+)\b/i) || u.match(/edicao\/[^/]*-(\d+)\b/i);
		if (mu && mu[1] && mu[1].replace(/^0+/, "") === want) return true;
		// sometimes the url ends with /<numeric id> but that is not the edition number
	}

	return false;
}

function scoreTitleCandidate(row: GuiaTitleRow, normalizedTitleQuery: string, normalizedPublisherQuery?: string) {
	const title = normalizeForComparison(row.title);
	const url = normalizeForComparison(row.url);
	const editora = normalizeForComparison(row.editora);
	let score = 0;

	if (title === normalizedTitleQuery) score += 60;
	if (title.includes(normalizedTitleQuery)) score += 70;
	if (url.includes(normalizedTitleQuery)) score += 20;
	if (editora.includes("abril")) score += 25;

	if (normalizedPublisherQuery) {
		if (editora.includes(normalizedPublisherQuery)) score += 180;
		else score -= 25;
	} else if (editora.includes("abril") && title === normalizedTitleQuery) {
		score += 240;
	}

	if (normalizedTitleQuery.includes("hulk") && /incrivel\s+hulk/.test(title)) score += 40;
	if (normalizedTitleQuery.includes("hulk") && editora.includes("abril") && title.includes("hulk")) score += 120;
	score += Math.min(row.issuesCount, 240) / 6;

	return score;
}

function isAbrilTitleCandidate(row: GuiaTitleRow) {
	const editora = normalizeForComparison(row.editora);
	const title = normalizeForComparison(row.title);
	const url = normalizeForComparison(row.url);

	return (
		editora.includes("abril") ||
		title.includes("/abril") ||
		title.endsWith(" abril") ||
		title.includes("- abril") ||
		url.includes("/abril")
	);
}

async function resolveCapasUrlFromKeyword(query: string): Promise<string | null> {
	const normalizedQuery = (query || "").trim();
	if (!normalizedQuery) return null;

	// Support queries with trailing edition numbers, e.g. "homem aranha 1" or "capitao america #3".
	const split = splitTitleAndEdition(normalizedQuery);
	const editionRequested = split.edition || "";
	const { title, publisher } = parseTitlePublisherQuery(split.title || normalizedQuery);
	const normalizedTitle = normalizeForComparison(title);
	const normalizedPublisher = normalizeForComparison(publisher);
	if (!normalizedTitle) return null;

	const aliasCapas =
		KEYWORD_CAPAS_ALIASES[normalizedTitle] || KEYWORD_CAPAS_ALIASES[normalizeForComparison(normalizedQuery)];
	if (aliasCapas) {
		// If an edition number was requested, try to pick the exact edition from the series page
		if (editionRequested) {
			try {
				const markdown = await fetchMirrorMarkdown(aliasCapas, 12000);
				if (markdown) {
					const editionResults = parseGuiaMarkdownResults(markdown);
					const match = editionResults.find((it) => matchesEdition(it, editionRequested));
					if (match) return match.url;
				}
			} catch {}
		}

		return aliasCapas;
	}

	try {
		const keywordUrl = `${BASE_URL}/titulos/${encodeURIComponent(title)}`;
		const markdown = await fetchMirrorMarkdown(keywordUrl, 18000);
		const rows = parseTitleSearchRows(markdown);
		if (!rows.length) return null;

		const directMatches = rows.filter((row) => {
			const rowTitle = normalizeForComparison(row.title);
			const rowUrl = normalizeForComparison(row.url);
			const rowPublisher = normalizeForComparison(row.editora);

			const titleMatch = rowTitle.includes(normalizedTitle) || rowUrl.includes(normalizedTitle);
			if (!titleMatch) return false;
			if (!normalizedPublisher) return true;
			return rowPublisher.includes(normalizedPublisher);
		});

		const candidateRows = directMatches.length ? directMatches : rows;

		const scored = candidateRows
			.map((row) => ({ row, score: scoreTitleCandidate(row, normalizedTitle, normalizedPublisher) }))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score);

		if (!scored.length) return null;

		const preferAbril = !normalizedPublisher;
		const preferredPool = preferAbril ? scored.filter((item) => isAbrilTitleCandidate(item.row)) : scored;
		const selectionPool = preferredPool.length ? preferredPool : scored;

		let selected = selectionPool[0];
		if (selected.row.issuesCount < 5) {
			const richer = selectionPool.find(
				(item) =>
					item.row.issuesCount >= 8 &&
					(normalizeForComparison(item.row.title).includes(normalizedTitle) ||
						normalizeForComparison(item.row.url).includes(normalizedTitle)) &&
					(!normalizedPublisher || normalizeForComparison(item.row.editora).includes(normalizedPublisher)),
			);
			if (richer) selected = richer;
		}

		// If the user requested a specific edition number (e.g. "homem aranha 1"), try to fetch
		// the series markdown and return the exact edition URL when available.
		if (editionRequested) {
			try {
				const seriesUrl = selected.row.url;
				const markdown = await fetchMirrorMarkdown(seriesUrl, 12000);
				if (markdown) {
					const editionResults = parseGuiaMarkdownResults(markdown);
					const match = editionResults.find((it) => matchesEdition(it, editionRequested));
					if (match) return match.url;
				}
			} catch {
				// fall back to series URL
			}
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

function decodeBasicHtmlEntities(value: string) {
	return (value || "")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, "&");
}

function parseAspNetPagerTargets(content: string) {
	const normalized = decodeBasicHtmlEntities(content);
	const numeric = new Map<number, string>();
	const numericRegex = /\[(\d+)\]\(javascript:__doPostBack\('([^']+)'\s*,\s*''\)\)/gi;
	let numericMatch: RegExpExecArray | null;
	while ((numericMatch = numericRegex.exec(normalized)) !== null) {
		const page = Number.parseInt(numericMatch[1], 10);
		const target = (numericMatch[2] || "").trim();
		if (!Number.isFinite(page) || !target) continue;
		if (!numeric.has(page)) numeric.set(page, target);
	}

	const allTargets = [...normalized.matchAll(/__doPostBack\('([^']+)'\s*,\s*''\)/gi)].map((m) => (m[1] || "").trim());
	const next = allTargets.find((target) => /\$ctl02\$ctl00$/i.test(target)) || null;

	return { numeric, next };
}

function parseHiddenInputValue(html: string, id: string) {
	const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const byId = new RegExp(`<input[^>]*id=["']${escapedId}["'][^>]*value=["']([^"']*)["']`, "i");
	const byName = new RegExp(`<input[^>]*name=["']${escapedId}["'][^>]*value=["']([^"']*)["']`, "i");
	return html.match(byId)?.[1] || html.match(byName)?.[1] || "";
}

function parseAspNetHiddenFields(html: string) {
	const viewState = parseHiddenInputValue(html, "__VIEWSTATE");
	const eventValidation = parseHiddenInputValue(html, "__EVENTVALIDATION");
	const viewStateGenerator = parseHiddenInputValue(html, "__VIEWSTATEGENERATOR");

	if (!viewState || !eventValidation) return null;
	return { viewState, eventValidation, viewStateGenerator };
}

function parseHiddenInputsForPostback(html: string) {
	const $ = cheerio.load(html);
	const hidden = new Map<string, string>();

	$('input[type="hidden"][name]').each((_, el) => {
		const $input = $(el);
		const name = ($input.attr("name") || "").trim();
		if (!name) return;
		hidden.set(name, decodeBasicHtmlEntities(($input.attr("value") || "").toString()));
	});

	return hidden;
}

async function fetchHtmlWithoutMirror(url: string, retries = 2, timeoutMs = 30000): Promise<string | null> {
	const makeRequest = async (targetUrl: string, init?: RequestInit, tms = timeoutMs) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), tms);
		try {
			const res = await fetch(targetUrl, {
				method: init?.method || "GET",
				headers: {
					Accept: "text/html,application/xhtml+xml",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Referer: BASE_URL,
					...(init?.headers || {}),
				},
				body: init?.body,
				signal: controller.signal,
			});
			if (!res.ok) return null;
			return await res.text();
		} finally {
			clearTimeout(timeoutId);
		}
	};

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const html = await makeRequest(url);
			if (html) return html;
		} catch {
			if (attempt < retries) {
				await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
			}
		}
	}

	if (SCRAPER_API_KEY && SCRAPER_API_KEY.length) {
		let proxy = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true&keep_headers=true`;
		proxy += "&country_code=BR";
		try {
			return await makeRequest(proxy, undefined, Math.max(timeoutMs, 90000));
		} catch {
			return null;
		}
	}

	return null;
}

async function postbackToCapasPage(capasUrl: string, currentHtml: string, eventTarget: string) {
	if (!eventTarget) return null;

	const hiddenInputs = parseHiddenInputsForPostback(currentHtml);
	if (!hiddenInputs.size) return null;

	const body = new URLSearchParams();
	hiddenInputs.forEach((value, key) => {
		body.set(key, value || "");
	});
	body.set("__EVENTTARGET", decodeBasicHtmlEntities(eventTarget));
	body.set("__EVENTARGUMENT", "");
	body.set("__LASTFOCUS", "");

	try {
		const res = await fetch(capasUrl, {
			method: "POST",
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: capasUrl,
				Origin: BASE_URL,
			},
			body: body.toString(),
		});

		if (res.ok) {
			const html = await res.text();
			if (html) return html;
		}
	} catch {
		// fall through to proxy attempt
	}

	if (SCRAPER_API_KEY && SCRAPER_API_KEY.length) {
		try {
			let proxy = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(capasUrl)}&render=true&keep_headers=true`;
			proxy += "&country_code=BR";
			const pres = await fetch(proxy, {
				method: "POST",
				headers: {
					Accept: "text/html,application/xhtml+xml",
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Referer: capasUrl,
				},
				body: body.toString(),
			});
			if (pres.ok) return await pres.text();
		} catch {
			return null;
		}
	}

	return null;
}

function parseGuiaHtmlResults(html: string, editionCode?: string) {
	const $ = cheerio.load(html);
	const seen = new Set<string>();
	const byUrl = new Map<string, any>();
	const results: Array<any> = [];
	const normalizedEditionCode = (editionCode || "").toLowerCase();
	const fullDateRegex =
		/(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}/i;

	$('a[href*="/capas/"], a[href*="/edicao/"]').each((_, el) => {
		const $a = $(el);
		let href = ($a.attr("href") || "").split("#")[0];
		if (!href) return;
		if (!href.startsWith("http")) href = new URL(href, BASE_URL).toString();
		href = normalizeGuiaUrl(href);
		if (!href || seen.has(href)) return;
		if (!/guiadosquadrinhos\.com/i.test(href) || !/(?:\/capas\/|\/edicao\/)/i.test(href)) return;
		if (normalizedEditionCode && !href.toLowerCase().includes(`/${normalizedEditionCode}/`)) return;

		const $img = $a.find("img").first();
		let title = "";
		if ($img.length) {
			title =
				normalizeText(($img.attr("alt") || "").trim()) ||
				normalizeText(($img.attr("title") || "").trim()) ||
				normalizeText(($a.attr("title") || "").trim()) ||
				normalizeText(($a.text() || "").trim());
		} else {
			title = normalizeText(($a.attr("title") || "").trim()) || normalizeText(($a.text() || "").trim());
		}

		const anchorText = normalizeText(($a.text() || "").replace(/\s+/g, " ").trim());
		const titleForMeta = anchorText || title;
		const listItemText = normalizeText(($a.closest("li").text() || "").replace(/\s+/g, " ").trim());

		let cover = "";
		if ($img.length) {
			cover = ($img.attr("data-src") || $img.attr("src") || "").trim();
			if (cover && !cover.startsWith("http")) cover = new URL(cover, BASE_URL).toString();
			cover = normalizeCoverUrl(cover);
		}

		const listMeta = extractIssueMetaFromTitle(listItemText);
		const titleMeta = extractIssueMetaFromTitle(titleForMeta);
		const meta = {
			editionNumber: listMeta.editionNumber || titleMeta.editionNumber,
			releaseDate: listMeta.releaseDate || titleMeta.releaseDate,
		};
		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		const parsedTitle = title || anchorText || listItemText;

		if (seen.has(href)) {
			const existing = byUrl.get(href);
			if (existing) {
				const existingHasFullDate = fullDateRegex.test(existing.releaseDate || "");
				const incomingHasFullDate = fullDateRegex.test(meta.releaseDate || "");

				if (
					(!existingHasFullDate && incomingHasFullDate) ||
					(meta.releaseDate || "").length > (existing.releaseDate || "").length
				) {
					existing.releaseDate = meta.releaseDate || existing.releaseDate || "";
				}

				if ((meta.editionNumber || "").length > (existing.editionNumber || "").length) {
					existing.editionNumber = meta.editionNumber || existing.editionNumber || "";
				}

				if (parsedTitle && parsedTitle.length > (existing.title || "").length) {
					existing.title = parsedTitle;
				}

				if (!existing.cover && cover) {
					existing.cover = cover;
				}
			}
			return;
		}

		seen.add(href);
		const item = {
			title: parsedTitle,
			url: href,
			cover,
			id,
			editionNumber: meta.editionNumber,
			releaseDate: meta.releaseDate,
			provider: "guiadosquadrinhos",
		};
		results.push(item);
		byUrl.set(href, item);
	});

	return results;
}

async function resolveDirectCapasHtmlByPostbackPage(capasUrl: string, page: number) {
	if (page < 1) return null;

	let currentHtml = await fetchHtmlWithoutMirror(capasUrl, 2, 30000);
	if (!currentHtml) return null;

	if (page === 1) {
		return { html: currentHtml, range: parseItensRange(currentHtml) };
	}

	let currentPage = 1;
	for (let guard = 0; guard < 40 && currentPage < page; guard++) {
		const { numeric, next } = parseAspNetPagerTargets(currentHtml);
		const targetForNext = numeric.get(currentPage + 1) || next;
		if (!targetForNext) return null;

		const nextHtml = await postbackToCapasPage(capasUrl, currentHtml, targetForNext);
		if (!nextHtml) return null;

		currentHtml = nextHtml;
		const nextRange = parseItensRange(nextHtml);
		if (nextRange) {
			const inferredPage = Math.max(
				1,
				Math.floor((nextRange.start - 1) / Math.max(1, nextRange.end - nextRange.start + 1)) + 1,
			);
			currentPage = Math.max(currentPage + 1, inferredPage);
		} else {
			currentPage += 1;
		}
	}

	if (currentPage < page) return null;
	return { html: currentHtml, range: parseItensRange(currentHtml) };
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
		const markdown = await fetchMirrorMarkdown(candidate, expectedPage === 1 ? 18000 : 12000);
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
	const byUrl = new Map<string, any>();
	const normalizedQuery = (query || "").toLowerCase();
	const normalizedEditionCode = (editionCode || "").toLowerCase();
	const releaseDateRegex =
		/(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}/i;

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
		const meta = extractIssueMetaFromTitle(title);
		const haystack = `${title} ${href}`.toLowerCase();
		if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;

		seen.add(href);
		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		const item = {
			title,
			url: href,
			cover,
			id,
			editionNumber: meta.editionNumber,
			releaseDate: meta.releaseDate,
			provider: "guiadosquadrinhos",
		};
		results.push(item);
		byUrl.set(href, item);
	}

	const textLinkRegex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
	let txtMatch: RegExpExecArray | null;
	while ((txtMatch = textLinkRegex.exec(markdown)) !== null) {
		const title = normalizeText((txtMatch[1] || "").trim());
		const meta = extractIssueMetaFromTitle(title);
		const href = normalizeGuiaUrl(toAbsoluteGuiaUrl((txtMatch[2] || "").trim()));
		if (!href) continue;
		if (!/guiadosquadrinhos\.com/i.test(href) || !/(?:\/capas\/|\/edicao\/)/i.test(href)) continue;
		if (normalizedEditionCode && !href.toLowerCase().includes(`/${normalizedEditionCode}/`)) continue;

		const haystack = `${title} ${href}`.toLowerCase();
		if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;

		if (seen.has(href)) {
			const existing = byUrl.get(href);
			if (existing) {
				const existingHasDate = releaseDateRegex.test(existing.title || "");
				const incomingHasDate = releaseDateRegex.test(title);
				if ((!existingHasDate && incomingHasDate) || title.length > (existing.title || "").length) {
					existing.title = title;
					existing.releaseDate = meta.releaseDate || existing.releaseDate || "";
					existing.editionNumber = meta.editionNumber || existing.editionNumber || "";
				}
			}
			continue;
		}

		seen.add(href);
		const parts = href.split("/").filter(Boolean);
		const id = parts.length ? parts[parts.length - 1] : href;
		const item = {
			title,
			url: href,
			cover: "",
			id,
			editionNumber: meta.editionNumber,
			releaseDate: meta.releaseDate,
			provider: "guiadosquadrinhos",
		};
		results.push(item);
		byUrl.set(href, item);
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

function isEdicaoUrl(url: string) {
	return /\/edicao\//i.test((url || "").trim());
}

function cleanMarkdownInline(text: string) {
	return normalizeText(
		(text || "")
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
			.replace(/\*\*/g, "")
			.replace(/\s+/g, " ")
			.trim(),
	);
}

function parseEditionStoriesFromMarkdown(markdown: string) {
	const stories: Array<{
		title: string;
		description: string;
		personagens?: string;
		roteiro?: string;
		desenho?: string;
		arteFinal?: string;
		cores?: string;
		letrista?: string;
		tradutor?: string;
		editorOriginal?: string;
		publicadaPrimeiraVez?: string;
	}> = [];

	if (!markdown) return stories;

	const blockRegex =
		/(?:^|\n)([^\n*][^\n]{2,})\n\n\*\*Personagens:\*\*\s*([^\n]+)([\s\S]*?)(?=\n[^\n*][^\n]{2,}\n\n\*\*Personagens:\*\*|\n\[!\[Image|\n\*\*Galeria de capas|\n$)/g;

	let m: RegExpExecArray | null;
	while ((m = blockRegex.exec(markdown)) !== null) {
		const title = cleanMarkdownInline((m[1] || "").trim());
		const personagens = cleanMarkdownInline((m[2] || "").trim());
		const blockBody = m[3] || "";

		const getField = (label: string) => {
			const rx = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
			return cleanMarkdownInline(blockBody.match(rx)?.[1] || "");
		};

		const roteiro = getField("Roteiro");
		const desenho = getField("Desenho");
		const arteFinal = getField("Arte-Final");
		const cores = getField("Cores");
		const letrista = getField("Letrista");
		const tradutor = getField("Tradutor");
		const editorOriginal = getField("Editor original");
		const publicadaPrimeiraVez = cleanMarkdownInline(
			blockBody.match(/Publicada pela primeira vez em\s*([^\n]+)/i)?.[1] || "",
		);

		let description = cleanMarkdownInline(
			blockBody.match(/Publicada pela primeira vez[^\n]*\n\n([^\n]{20,})/i)?.[1] || "",
		);
		if (!description) {
			description = cleanMarkdownInline(blockBody.match(/\n\n([^\n]{20,})\n\nT[ií]tulo original:/i)?.[1] || "");
		}

		if (!title && !description) continue;

		stories.push({
			title,
			description,
			personagens,
			roteiro,
			desenho,
			arteFinal,
			cores,
			letrista,
			tradutor,
			editorOriginal,
			publicadaPrimeiraVez,
		});
	}

	return stories;
}

function toSingleEditionResult(url: string) {
	const normalizedUrl = normalizeGuiaUrl(url);
	let slug = "";
	let id = normalizedUrl;

	try {
		const parsed = new URL(normalizedUrl);
		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length >= 2) slug = decodeURIComponent(parts[1] || "");
		if (parts.length >= 4) id = parts[3] || id;
	} catch {
		// keep fallback values
	}

	const editionMatch = slug.match(/(?:^|-)n-(\d+)\b/i) || slug.match(/(?:n[°º]?|#)\s*(\d+)\b/i);
	const editionNumber = editionMatch?.[1] ? `#${editionMatch[1].replace(/^0+/, "") || "0"}` : "";

	const baseTitle = normalizeText(
		slug
			.replace(/(?:^|-)n-\d+\b.*$/i, "")
			.replace(/-/g, " ")
			.trim(),
	);

	const title = baseTitle && editionNumber ? `${baseTitle} ${editionNumber}` : baseTitle || editionNumber || "Edição";

	return {
		title,
		url: normalizedUrl,
		cover: "",
		id,
		editionNumber,
		releaseDate: "",
		provider: "guiadosquadrinhos",
	};
}

async function scrapeEditionDetails(edicaoUrl: string) {
	const normalizedUrl = normalizeGuiaUrl(edicaoUrl);
	let html = "";
	let markdown = "";

	try {
		html = (await fetchHtmlWithoutMirror(normalizedUrl, 1, 15000)) || "";
	} catch {
		html = "";
	}

	try {
		markdown = await fetchMirrorMarkdown(normalizedUrl, 15000);
	} catch {
		if (!html) return toSingleEditionResult(normalizedUrl);
	}

	const singleFallback = toSingleEditionResult(normalizedUrl);
	const $ = html ? cheerio.load(html) : null;

	const titleFromMeta = normalizeText(markdown.match(/^Title:\s*(.+)$/im)?.[1] || "");
	const titleFromBody = normalizeText(markdown.match(/^([^\n|]+)\|\s*Guia dos Quadrinhos/im)?.[1] || "");
	const titleFromHtml = normalizeText(($?.("h1").first().text() || "").trim());
	const title = titleFromMeta || titleFromBody || titleFromHtml || singleFallback.title;

	const coverFromMarkdown =
		normalizeCoverUrl(
			toAbsoluteGuiaUrl(
				markdown.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]*ShowImage\.aspx[^)\s]*)\)/i)?.[1] ||
					markdown.match(/!\[[^\]]*\]\(([^)\s]*ShowImage\.aspx[^)\s]*)\)/i)?.[1] ||
					"",
			),
		) || "";
	let coverFromHtml = "";
	let coverFromMeta = "";
	if ($) {
		const ogImage =
			($('meta[property="og:image"]').attr("content") || "").trim() ||
			($('meta[name="twitter:image"]').attr("content") || "").trim();
		if (ogImage) {
			const absOg = /^https?:\/\//i.test(ogImage) ? ogImage : new URL(ogImage, BASE_URL).toString();
			coverFromMeta = normalizeCoverUrl(absOg);
		}

		const srcCandidate =
			($('img[src*="ShowImage.aspx"]').first().attr("src") || "").trim() ||
			($('img[data-src*="ShowImage.aspx"]').first().attr("data-src") || "").trim() ||
			($('a[href*="ShowImage.aspx"] img').first().attr("src") || "").trim() ||
			($('a[href*="ShowImage.aspx"]').first().attr("href") || "").trim() ||
			($('img[src*="/images/capas/"]').first().attr("src") || "").trim() ||
			($('img[data-src*="/images/capas/"]').first().attr("data-src") || "").trim();
		if (srcCandidate) {
			const abs = /^https?:\/\//i.test(srcCandidate) ? srcCandidate : new URL(srcCandidate, BASE_URL).toString();
			coverFromHtml = normalizeCoverUrl(abs);
		}
	}
	const cover = coverFromMarkdown || coverFromHtml || coverFromMeta || "";

	const releaseDate = normalizeText(markdown.match(/\*\*Publicado em:\*\*\s*([^\n]+)/i)?.[1] || "");
	const editora = normalizeText(
		markdown.match(/\*\*Editora:\*\*\s*(?:\[([^\]]+)\]\([^)]+\)|([^\n]+))/i)?.[1] ||
			markdown.match(/\*\*Editora:\*\*\s*(?:\[([^\]]+)\]\([^)]+\)|([^\n]+))/i)?.[2] ||
			"",
	);
	const licenciador = normalizeText(markdown.match(/\*\*Licenciador:\*\*\s*([^\n]+)/i)?.[1] || "");
	const categoria = normalizeText(markdown.match(/\*\*Categoria:\*\*\s*([^\n]+)/i)?.[1] || "");
	const numeroPaginas = normalizeText(markdown.match(/\*\*N[uú]mero de p[aá]ginas:\*\*\s*([^\n]+)/i)?.[1] || "");
	const formato = normalizeText(markdown.match(/\*\*Formato:\*\*\s*([^\n]+)/i)?.[1] || "");
	const precoCapa = normalizeText(markdown.match(/\*\*Pre[cç]o de capa:\*\*\s*([^\n]+)/i)?.[1] || "");

	const parts = normalizedUrl.split("/").filter(Boolean);
	const id = parts.length ? parts[parts.length - 1] : normalizedUrl;
	const meta = extractIssueMetaFromTitle(title);

	const stories = parseEditionStoriesFromMarkdown(markdown);

	return {
		title,
		url: normalizedUrl,
		cover,
		id,
		editionNumber: meta.editionNumber,
		releaseDate: meta.releaseDate || releaseDate,
		editora,
		licenciador,
		categoria,
		numeroPaginas,
		formato,
		precoCapa,
		stories,
		provider: "guiadosquadrinhos",
	};
}

async function scrapeGuiaSearch(query?: string, page = 1) {
	const directCapasUrl = getDirectCapasUrl(query);
	if (directCapasUrl) {
		if (isEdicaoUrl(directCapasUrl)) {
			const single = await scrapeEditionDetails(directCapasUrl);
			return {
				results: [single],
				pagination: { current_page: 1, has_more: false, total_results: 1, page_size: 1 },
				success: true,
				searched_url: directCapasUrl,
			};
		}

		const postbackPage = await resolveDirectCapasHtmlByPostbackPage(directCapasUrl, page);
		if (postbackPage) {
			const editionCode = getEditionCodeFromCapasUrl(directCapasUrl);
			const directResults = parseGuiaHtmlResults(postbackPage.html, editionCode);
			const range = postbackPage.range;
			const pageSize = range ? Math.max(1, range.end - range.start + 1) : directResults.length || 30;
			const hasMore = range
				? range.end < range.total
				: /\$ctl02\$ctl00/i.test(postbackPage.html) || /__doPostBack/i.test(postbackPage.html);

			if (directResults.length > 0) {
				return {
					results: directResults,
					pagination: {
						current_page: page,
						has_more: hasMore,
						total_results: range?.total ?? 0,
						page_size: pageSize,
					},
					success: true,
					searched_url: directCapasUrl,
				};
			}
		}

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
				page_size: range ? Math.max(1, range.end - range.start + 1) : directResults.length,
			},
			success: true,
			searched_url: usedUrl,
		};
	}

	if (query?.trim()) {
		const keywordCapasUrl = await resolveCapasUrlFromKeyword(query);
		if (keywordCapasUrl) {
			if (isEdicaoUrl(keywordCapasUrl)) {
				const single = await scrapeEditionDetails(keywordCapasUrl);
				return {
					results: [single],
					pagination: { current_page: 1, has_more: false, total_results: 1, page_size: 1 },
					success: true,
					searched_url: keywordCapasUrl,
				};
			}

			const postbackPage = await resolveDirectCapasHtmlByPostbackPage(keywordCapasUrl, page);
			if (postbackPage) {
				const editionCode = getEditionCodeFromCapasUrl(keywordCapasUrl);
				const keywordResults = parseGuiaHtmlResults(postbackPage.html, editionCode);
				const range = postbackPage.range;
				const pageSize = range ? Math.max(1, range.end - range.start + 1) : keywordResults.length || 30;
				const hasMore = range
					? range.end < range.total
					: /\$ctl02\$ctl00/i.test(postbackPage.html) || /__doPostBack/i.test(postbackPage.html);

				if (keywordResults.length > 0) {
					return {
						results: keywordResults,
						pagination: {
							current_page: page,
							has_more: hasMore,
							total_results: range?.total ?? 0,
							page_size: pageSize,
						},
						success: true,
						searched_url: keywordCapasUrl,
					};
				}
			}

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
					page_size: range ? Math.max(1, range.end - range.start + 1) : keywordResults.length,
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
		let searchedUrl: string | null = null;

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
			searchedUrl = `fixture:${fixturePath}`;
		} else {
			const data = (await Promise.race([
				scrapeGuiaSearch(query, page),
				new Promise((_, reject) => setTimeout(() => reject(new Error("Scraping operation timed out")), 60000)),
			])) as any;
			results = data.results || [];
			hasMore = data.pagination?.has_more || false;
			totalResults = data.pagination?.total_results || results.length;
			pageSize = data.pagination?.page_size || results.length;
			searchedUrl = data.searched_url || null;
		}

		return NextResponse.json(results, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
				"X-Guia-Has-More": String(!!hasMore),
				"X-Guia-Total-Results": String(totalResults || 0),
				"X-Guia-Page-Size": String(pageSize || 0),
				"X-Guia-Searched-URL": String(searchedUrl || ""),
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
