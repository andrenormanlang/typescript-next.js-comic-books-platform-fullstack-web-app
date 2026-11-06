// Pure text helpers for analyze-cover (no network). Covered by cover-text.test.ts.

import { normalizeKey } from "./comic-options.ts";

const PT_MONTHS: Record<string, number> = {
	janeiro: 1,
	fevereiro: 2,
	marco: 3,
	abril: 4,
	maio: 5,
	junho: 6,
	julho: 7,
	agosto: 8,
	setembro: 9,
	outubro: 10,
	novembro: 11,
	dezembro: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

function validDate(y: number, m: number, d: number): string {
	if (y < 1890 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
	return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Any date a source gives → YYYY-MM-DD for <input type="date">, or "".
 * Handles ISO ("2012-03-01", "2012-03"), "dd/mm/yyyy", Portuguese
 * ("março de 1986", "Março 1986"), and a bare year ("1986" → 1986-01-01).
 * Unknown day/month default to 01.
 */
export function normalizeDate(raw: string | null | undefined): string {
	const s = (raw ?? "").trim();
	if (!s) return "";

	let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
	if (m) return validDate(+m[1], +m[2], m[3] ? +m[3] : 1);

	m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) return validDate(+m[3], +m[2], +m[1]);

	const key = normalizeKey(s);
	m = key.match(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b(?:\s+de)?\s+(\d{4})\b/);
	if (m) return validDate(+m[2], PT_MONTHS[m[1]], 1);

	m = key.match(/\b(1[89]\d{2}|20\d{2})\b/);
	if (m) return validDate(+m[1], 1, 1);

	return "";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/** HTML → plain text: drops tags, scripts, tables and figures; decodes basic entities. */
export function htmlToText(html: string | null | undefined): string {
	return (html ?? "")
		.replace(/<(script|style|table|figure)[\s\S]*?<\/\1>/gi, " ")
		.replace(/<\/(p|div|h\d|li)>|<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "") // inline tags (<em>, <a>) vanish without adding spaces
		.replace(/&(#\d+|[a-z]+);/gi, (all, code: string) => {
			if (ENTITIES[code.toLowerCase()]) return ENTITIES[code.toLowerCase()];
			if (code.startsWith("#")) return String.fromCharCode(Number(code.slice(1)));
			return all;
		})
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}

/** Cut to at most `max` characters, ending at a sentence boundary when possible. */
export function truncateAtSentence(text: string, max = 600): string {
	const t = text.trim();
	if (t.length <= max) return t;
	const slice = t.slice(0, max);
	const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
	return end > max * 0.4 ? slice.slice(0, end + 1) : slice.replace(/\s+\S*$/, "") + "…";
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Plain text → <p> paragraphs for the rich-text editor. */
export function toParagraphs(text: string): string {
	return text
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => `<p>${escapeHtml(line)}</p>`)
		.join("");
}

/** Source HTML/text description → short, safe HTML. */
export function toDescription(raw: string | null | undefined, max = 600): string {
	const text = truncateAtSentence(htmlToText(raw), max);
	return text ? toParagraphs(text) : "";
}

/**
 * Split a title into series + issue number:
 * "Saga #1" → {Saga, 1}; "Superaventuras Marvel nº 44" → {Superaventuras Marvel, 44}.
 */
export function parseTitle(title: string | null | undefined): { series: string; issue: string } {
	const t = (title ?? "").trim();
	// The "nº"/"no." marker must follow a space, or "X-Men 044" would lose its "n".
	const m = t.match(/^(.*?)(?:\s*#\s*|\s+n[°º.]\s*|\s+no\.?\s+|\s+vol\.?\s*|[\s,:-]+)(\d+)\s*$/i);
	if (m && m[1].trim()) return { series: m[1].trim(), issue: String(Number(m[2])) };
	return { series: t, issue: "" };
}

/** 0–1 similarity of two series names (accent/case/punctuation-insensitive). */
export function nameSimilarity(a: string, b: string): number {
	const strip = (s: string) => normalizeKey(s).replace(/^(the|o|a|os|as)\s+/, "");
	const x = strip(a);
	const y = strip(b);
	if (!x || !y) return 0;
	if (x === y) return 1;
	const wx = new Set(x.split(" "));
	const wy = new Set(y.split(" "));
	const shared = [...wx].filter((w) => wy.has(w)).length;
	return shared / new Set([...wx, ...wy]).size;
}

/** Issue numbers compare without leading zeros ("044" == "44"). */
export function sameIssue(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
	const clean = (v: string | number | null | undefined) => String(v ?? "").replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
	const x = clean(a);
	return !!x && x === clean(b);
}

/**
 * Score a source candidate. Name must be close (>= 0.75); the issue number must
 * match; a year near the cover's year wins ties (foreign reprints often share
 * the name and number, e.g. the German "Saga #1").
 */
export function scoreCandidate(
	candidate: { name: string; issue: string | number; year?: number | null },
	wanted: { series: string; issue: string; year?: number | null },
): number {
	if (!sameIssue(candidate.issue, wanted.issue)) return 0;
	const sim = nameSimilarity(candidate.name, wanted.series);
	if (sim < 0.75) return 0;
	let score = sim * 10;
	if (wanted.year && candidate.year) score -= Math.min(Math.abs(candidate.year - wanted.year), 5);
	return score;
}

export function pickBest<T>(items: T[], score: (item: T) => number): T | null {
	let best: T | null = null;
	let bestScore = 0;
	for (const item of items) {
		const s = score(item);
		if (s > bestScore) {
			best = item;
			bestScore = s;
		}
	}
	return best;
}

/**
 * Collector era for a cover year. Boundaries follow the usual US hobby
 * convention (they are approximate by nature); computed here so the AI
 * description never has to guess it.
 */
export function comicEra(year: number | null | undefined): string {
	if (!year || year < 1897) return "";
	if (year < 1938) return "Platinum Age";
	if (year < 1956) return "Golden Age";
	if (year < 1970) return "Silver Age";
	if (year < 1985) return "Bronze Age";
	if (year < 1992) return "Copper Age";
	return "Modern Age";
}

/** "Stan Lee / Jack Kirby", "Lee e Kirby", "A, B & C" → individual names. */
export function splitNames(value: string | null | undefined): string[] {
	return (value ?? "")
		.split(/\s*(?:[,/;&+]|\se\s|\sand\s)\s*/i)
		.map((n) => n.trim())
		.filter((n) => n.length > 1);
}

/** Merge name lists in priority order, without duplicates (accent/case-insensitive). */
export function combineNames(lists: Array<string[] | undefined>, max = 3): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const list of lists) {
		for (const name of list ?? []) {
			const key = normalizeKey(name);
			if (!key || seen.has(key)) continue;
			seen.add(key);
			out.push(name.trim());
			if (out.length >= max) return out;
		}
	}
	return out;
}
