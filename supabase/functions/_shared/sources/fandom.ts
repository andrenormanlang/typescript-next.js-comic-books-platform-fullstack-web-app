// Marvel Database (marvel.fandom.com) and DC Database (dc.fandom.com).
// Free MediaWiki API, no key. Pages are "<Series> Vol <n> <issue>" and use the
// "Comic Template" (Writer1_1, Penciler1_1, Synopsis1, Notes, Trivia, Year,
// Month, {{1st|...}} first appearances). Best source for collector notes:
// e.g. Daredevil #183 → "First meeting between Daredevil and Punisher".
// Only used for Marvel / DC / Vertigo covers (Fandom documents the US originals).

import { normalizePublisher } from "../comic-options.ts";
import { nameSimilarity, normalizeDate, sameIssue, splitNames, toDescription, truncateAtSentence } from "../cover-text.ts";
import type { CollectorFacts, SourceAdapter } from "./types.ts";

const USER_AGENT = "retro-pop-cover-lookup/1.0";

const WIKIS: Record<string, string> = {
	"Marvel Comics": "marvel.fandom.com",
	"DC Comics": "dc.fandom.com",
	Vertigo: "dc.fandom.com",
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Value of a "| Field = ..." template parameter (multi-line), or "". */
function field(wikitext: string, name: string): string {
	const re = new RegExp(`^\\|\\s*${name}\\s*=([\\s\\S]*?)(?=^\\|\\s*[A-Za-z0-9_ ]+\\s*=|^\\}\\})`, "m");
	return (wikitext.match(re)?.[1] ?? "").trim();
}

/** Wiki markup → readable text. "{{cl|Daredevil Vol 1 167}}" → "Daredevil #167". */
export function wikiToText(markup: string): string {
	let s = markup
		.replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/gi, "")
		.replace(/\{\{(?:cl|c|cid)\|([^|}]+)(?:\|([^}]+))?\}\}/gi, (_, page: string, label?: string) =>
			(label ?? page).replace(/^(.+?) Vol \d+ (\d+)$/, "$1 #$2"),
		)
		.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1") // [[Page|Label]] → Label
		.replace(/\s*\((?:Earth|Multiverse)-[^)]*\)/g, ""); // drop "(Earth-616)"
	// Remove remaining templates, innermost first.
	for (let i = 0; i < 5 && /\{\{[^{}]*\}\}/.test(s); i++) s = s.replace(/\{\{[^{}]*\}\}/g, "");
	return s
		.replace(/'{2,}/g, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/[ \t]+/g, " ")
		.trim();
}

/** "* note one\n* note two" → ["note one", "note two"]. */
function bullets(markup: string): string[] {
	return markup
		.split(/\n(?=\s*\*)/)
		.map((line) => wikiToText(line.replace(/^\s*\*+\s*/, "")))
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter((line) => line.length > 3);
}

export type FandomParsed = {
	year: number | null;
	releaseDate: string;
	facts: CollectorFacts;
};

/** Pure parser for a Fandom comic page (tested in fandom.test.ts). */
export function parseFandomWikitext(wikitext: string): FandomParsed {
	const year = Number(field(wikitext, "Year")) || null;
	const monthIndex = MONTHS.indexOf(field(wikitext, "Month").toLowerCase());
	const releaseDate = year ? normalizeDate(`${year}-${monthIndex >= 0 ? monthIndex + 1 : 1}`) : "";

	const numbered = (prefix: string) =>
		[1, 2, 3, 4, 5].flatMap((n) => splitNames(wikiToText(field(wikitext, `${prefix}_${n}`))));

	const firstAppearances = [...wikitext.matchAll(/\{\{1st(?: [^|}]*)?\|([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/g)]
		.map((m) => wikiToText(m[1]))
		.filter(Boolean);

	const synopsis = wikiToText(field(wikitext, "Synopsis1"));

	return {
		year,
		releaseDate,
		facts: {
			storyTitles: [1, 2, 3].map((n) => wikiToText(field(wikitext, `StoryTitle${n}`))).filter(Boolean),
			synopsis: synopsis ? truncateAtSentence(synopsis, 1200) : undefined,
			// Letters-page entries ("Devil's Advocate" etc.) aren't collector facts.
			notes: bullets(field(wikitext, "Notes"))
				.filter((n) => !/\bletters? (page|column)\b/i.test(n))
				.slice(0, 8),
			trivia: bullets(field(wikitext, "Trivia")).slice(0, 5),
			firstAppearances: [...new Set(firstAppearances)].slice(0, 10),
			writers: numbered("Writer1"),
			artists: numbered("Penciler1"),
		},
	};
}

export const fandom: SourceAdapter = async (id, signal) => {
	const host = WIKIS[normalizePublisher(id.publisher)];
	if (!host || !id.series || !id.issue) return null;

	const api = async <T>(params: Record<string, string>): Promise<T | null> => {
		const qs = new URLSearchParams({ format: "json", formatversion: "2", ...params });
		const res = await fetch(`https://${host}/api.php?${qs}`, { headers: { "User-Agent": USER_AGENT }, signal });
		return res.ok ? ((await res.json()) as T) : null;
	};

	// 1. Find "<Series> Vol <n> <issue>" pages for this issue.
	const search = await api<{ query?: { search?: Array<{ title: string }> } }>({
		action: "query",
		list: "search",
		srsearch: `${id.series} ${id.issue}`,
		srnamespace: "0",
		srlimit: "10",
	});
	const candidates = (search?.query?.search ?? [])
		.map((r) => ({ title: r.title, m: r.title.match(/^(.+?) Vol (\d+) (\S+)$/) }))
		.filter((c) => c.m && sameIssue(c.m[3], id.issue) && nameSimilarity(c.m[1], id.series) >= 0.75)
		.slice(0, 3);
	if (!candidates.length) return null;

	// 2. Fetch their wikitext in one request; several volumes can share an issue
	//    number (Daredevil Vol 1 #1 vs Vol 2 #1), so pick by the cover year.
	const pages = await api<{ query?: { pages?: Array<{ title: string; revisions?: Array<{ slots: { main: { content: string } } }> }> } }>({
		action: "query",
		prop: "revisions",
		rvprop: "content",
		rvslots: "main",
		redirects: "1",
		titles: candidates.map((c) => c.title).join("|"),
	});
	const parsed = (pages?.query?.pages ?? [])
		.filter((p) => p.revisions?.[0]?.slots.main.content)
		.map((p) => ({ title: p.title, ...parseFandomWikitext(p.revisions![0].slots.main.content) }));
	if (!parsed.length) return null;

	const best = id.year
		? [...parsed].sort((a, b) => Math.abs((a.year ?? 0) - id.year!) - Math.abs((b.year ?? 0) - id.year!))[0]
		: parsed.find((p) => / Vol 1 /.test(p.title)) ?? parsed[0];
	if (id.year && best.year && Math.abs(best.year - id.year) > 2) return null; // wrong volume

	return {
		source: "fandom",
		url: `https://${host}/wiki/${encodeURIComponent(best.title.replace(/ /g, "_"))}`,
		values: {
			release_date: best.releaseDate,
			main_writer: best.facts.writers?.join(", ") ?? "",
			main_artist: best.facts.artists?.join(", ") ?? "",
			description: toDescription(best.facts.synopsis),
		},
		facts: best.facts,
	};
};
