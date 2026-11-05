// Guia dos Quadrinhos (Brazilian editions). Reuses the app's existing scraper
// route src/app/api/guia-search/route.ts over HTTP instead of porting it:
//   1. GET {SITE_URL}/api/guia-search?query=<series> <issue>  → edition list
//   2. GET {SITE_URL}/api/guia-search?query=<edition URL>      → [scrapeEditionDetails()]
// The scraper can fall back to slow proxies, so the caller's AbortSignal bounds it.

import { clampPages, normalizePublisher } from "../comic-options.ts";
import { nameSimilarity, normalizeDate, parseTitle, pickBest, sameIssue, toDescription } from "../cover-text.ts";
import type { SourceAdapter } from "./types.ts";

type GuiaListItem = { title?: string; url?: string; editionNumber?: string; releaseDate?: string };
type GuiaStory = { title?: string; description?: string; roteiro?: string; desenho?: string };
type GuiaEdition = GuiaListItem & { editora?: string; numeroPaginas?: string; stories?: GuiaStory[] };

const isEdition = (url?: string) => /\/edicao\//i.test(url ?? "");

/** Story titles + blurbs as the description, e.g. "Homem-Aranha: O Fim. …" */
function storiesText(stories: GuiaStory[] = []): string {
	return stories
		.map((s) => [s.title, s.description].filter(Boolean).join(": "))
		.filter(Boolean)
		.join("\n");
}

export const guia: SourceAdapter = async (id, signal) => {
	const site = Deno.env.get("SITE_URL")?.replace(/\/+$/, "");
	if (!site || !id.series) return null;

	const get = async <T>(query: string): Promise<T | null> => {
		const res = await fetch(`${site}/api/guia-search?query=${encodeURIComponent(query)}`, { signal });
		if (!res.ok) return null;
		const body = await res.json().catch(() => null);
		return Array.isArray(body) ? (body as T) : null;
	};

	const list = await get<GuiaEdition[]>(id.issue ? `${id.series} ${id.issue}` : id.series);
	if (!list?.length) return null;

	// The route returns full details directly when the query resolves to one edition.
	let edition: GuiaEdition | null = list.find((e) => e.editora || e.stories?.length) ?? null;

	if (!edition) {
		const best = pickBest(list.filter((e) => isEdition(e.url)), (e) => {
			const issueOk = !id.issue || sameIssue(e.editionNumber, id.issue) || sameIssue(parseTitle(e.title).issue, id.issue);
			if (!issueOk) return 0;
			return 1 + nameSimilarity(parseTitle(e.title).series, id.series);
		});
		if (!best?.url) return null;
		edition = (await get<GuiaEdition[]>(best.url))?.[0] ?? null;
		if (!edition) return null;
	}

	const story = edition.stories?.find((s) => s.roteiro || s.desenho);
	const title = (edition.title ?? "").replace(/\s*[-|]\s*Guia dos Quadrinhos.*$/i, "").trim();

	return {
		source: "guia",
		url: edition.url ?? null,
		values: {
			title,
			publisher: normalizePublisher(edition.editora),
			release_date: normalizeDate(edition.releaseDate),
			pages: clampPages(parseInt(edition.numeroPaginas ?? "", 10)),
			main_writer: story?.roteiro ?? "",
			main_artist: story?.desenho ?? "",
			description: toDescription(storiesText(edition.stories)),
		},
	};
};
