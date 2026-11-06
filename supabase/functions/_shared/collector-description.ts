// "Collector copywriter": turns the facts gathered from the comic databases into
// a listing description with two parts:
//   1. the story (spoiler-light), and
//   2. "Collector notes" — why the issue matters (key appearances, creators,
//      era, notable history such as a story rewritten for the Comics Code).
// Gemini may ONLY use the facts it is given. Era and cover price are computed
// or copied in code, never guessed.

import { generateJson } from "./gemini.ts";
import type { CoverSource } from "./comic-options.ts";
import { comicEra } from "./cover-text.ts";
import type { CollectorFacts, SourceResult } from "./sources/types.ts";

const SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		story: { type: "string" },
		collector_notes: { type: "array", items: { type: "string" }, maxItems: 6 },
	},
	required: ["story", "collector_notes"],
};

const SYSTEM =
	"You write listings for a comic book marketplace for collectors. Use ONLY the facts provided in the JSON input. " +
	"Never add facts, numbers, creators, appearances or events that are not in the input. Never state a market value, " +
	"grade, condition or rarity claim. Output ONLY a JSON object matching the schema.";

export type CollectorInput = {
	title: string;
	publisher?: string;
	releaseDate?: string;
	writers?: string;
	artists?: string;
	language: string; // language to write in (ISO 639-1)
	sources: SourceResult[];
};

export type CollectorDescription = {
	html: string;
	usedSources: Array<Exclude<CoverSource, "ai">>;
};

const uniq = (items: Array<string | undefined>) => [...new Set(items.map((s) => s?.trim()).filter(Boolean) as string[])];

/** Everything the databases know, merged into one fact sheet for the prompt. */
export function buildFactSheet(input: CollectorInput) {
	const facts = input.sources.map((r) => r.facts).filter(Boolean) as CollectorFacts[];
	const year = Number(input.releaseDate?.slice(0, 4)) || null;
	return {
		title: input.title,
		publisher: input.publisher || undefined,
		cover_date: input.releaseDate || undefined,
		era: comicEra(year) || undefined,
		writers: input.writers || undefined,
		artists: input.artists || undefined,
		cover_price: facts.find((f) => f.coverPrice)?.coverPrice,
		story_titles: uniq(facts.flatMap((f) => f.storyTitles ?? [])).slice(0, 6),
		first_appearances: uniq(facts.flatMap((f) => f.firstAppearances ?? [])).slice(0, 10),
		deaths: uniq(facts.flatMap((f) => f.deaths ?? [])).slice(0, 6),
		notable_notes: uniq(facts.flatMap((f) => f.notes ?? [])).slice(0, 8),
		trivia: uniq(facts.flatMap((f) => f.trivia ?? [])).slice(0, 4),
		characters: uniq(facts.flatMap((f) => f.characters ?? [])).slice(0, 12),
		synopses: input.sources
			.filter((r) => r.facts?.synopsis)
			.map((r) => ({ source: r.source, text: r.facts!.synopsis! })),
	};
}

/** True when there is more to say than a bare title (otherwise skip the extra AI call). */
export function hasCollectorFacts(sheet: ReturnType<typeof buildFactSheet>): boolean {
	return sheet.synopses.length > 0 || sheet.notable_notes.length > 0 || sheet.first_appearances.length > 0;
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const NOTES_HEADING: Record<string, string> = { pt: "Notas para colecionadores", es: "Notas para coleccionistas" };

/** Story paragraph + "Collector notes" list, as HTML for the rich-text editor. */
export function toCollectorHtml(story: string, notes: string[], language: string): string {
	const parts: string[] = [];
	if (story.trim()) parts.push(`<p>${escapeHtml(story.trim())}</p>`);
	const items = notes.map((n) => n.trim()).filter(Boolean);
	if (items.length) {
		const heading = NOTES_HEADING[language.slice(0, 2).toLowerCase()] ?? "Collector notes";
		parts.push(`<p><strong>${heading}</strong></p>`);
		parts.push(`<ul>${items.map((n) => `<li><p>${escapeHtml(n)}</p></li>`).join("")}</ul>`);
	}
	return parts.join("");
}

export async function writeCollectorDescription(input: CollectorInput): Promise<CollectorDescription | null> {
	const sheet = buildFactSheet(input);
	if (!hasCollectorFacts(sheet)) return null;

	const prompt = [
		`Write the listing description in this language: ${input.language || "en"}.`,
		"story: 2-4 sentences on what happens in the issue, based on the synopses. Spoiler-light: no endings, no twists.",
		"collector_notes: 2-6 short bullet points on why collectors want this issue, each based on a fact in the input:",
		"  first appearances, deaths, notable_notes (e.g. history, first meetings, Comics Code), the creators,",
		"  the era and the original cover price. Leave out anything not in the input. Fewer notes is fine.",
		"",
		"FACTS (JSON):",
		JSON.stringify(sheet, null, 1),
	].join("\n");

	const { text } = await generateJson({ prompt, schema: SCHEMA, system: SYSTEM });
	const out = JSON.parse(text) as { story?: string; collector_notes?: string[] };
	const html = toCollectorHtml(out.story ?? "", out.collector_notes ?? [], input.language || "en");
	if (!html) return null;

	return { html, usedSources: input.sources.filter((r) => r.facts).map((r) => r.source) };
}
