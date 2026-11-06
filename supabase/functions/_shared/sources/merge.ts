import { normalizeKey, normalizePublisher, type CoverField, type CoverValues } from "../comic-options.ts";
import { combineNames, splitNames } from "../cover-text.ts";
import type { Identification, MergeResult, SourceResult } from "./types.ts";

type DbSource = SourceResult["source"];

// Publishers whose presence means a Brazilian edition (→ Guia dos Quadrinhos first).
const BRAZILIAN_PUBLISHERS = ["abril", "ebal", "rge", "bloch", "panini brasil", "globo", "la selva", "o cruzeiro", "mythos", "devir"];

export function isBrazilian(id: Pick<Identification, "language" | "country" | "publisher">): boolean {
	if (id.country?.toUpperCase() === "BR") return true;
	if (id.language?.toLowerCase().startsWith("pt")) return true;
	const pub = normalizeKey(id.publisher ?? "");
	return BRAZILIAN_PUBLISHERS.some((p) => pub.includes(p));
}

// Publishers with a Fandom wiki (marvel.fandom.com / dc.fandom.com).
const FANDOM_PUBLISHERS = ["Marvel Comics", "DC Comics", "Vertigo"];

/**
 * Which databases to ask, in priority order. Gemini ("ai") is always the last
 * resort. Fandom documents the US originals, so it's skipped for Brazilian
 * editions even of Marvel/DC stories.
 */
export function sourceOrder(id: Pick<Identification, "language" | "country" | "publisher">): DbSource[] {
	if (isBrazilian(id)) return ["guia", "comicvine"];
	const order: DbSource[] = ["metron", "comicvine"];
	if (FANDOM_PUBLISHERS.includes(normalizePublisher(id.publisher))) order.push("fandom");
	return order;
}

const hasValue = (v: unknown) => (typeof v === "number" ? v > 0 : typeof v === "string" ? v.trim() !== "" : false);

// Credits are combined across databases instead of taken from one: Metron lists
// only Roger McKenzie as writer of Daredevil #183, Comic Vine and Fandom also
// credit Frank Miller.
const CREDIT_FIELDS: Partial<Record<CoverField, "writers" | "artists">> = {
	main_writer: "writers",
	main_artist: "artists",
};

/**
 * For each requested field: the first database result (callers pass results in
 * sourceOrder) with a value wins; otherwise Gemini's value. Writer and artist
 * combine every database's names (deduplicated, priority order, max 3). Genre
 * always comes from Gemini: no database uses the form's genre list.
 */
export function mergeValues(
	fields: readonly CoverField[],
	results: SourceResult[],
	ai: Partial<CoverValues>,
): MergeResult {
	const values: Partial<CoverValues> = {};
	const sources: MergeResult["sources"] = {};

	for (const field of fields) {
		const creditKey = CREDIT_FIELDS[field];
		if (creditKey) {
			const lists = results.map((r) => r.facts?.[creditKey] ?? splitNames(r.values[field] as string | undefined));
			const names = combineNames(lists);
			if (names.length) {
				(values as Record<string, unknown>)[field] = names.join(", ");
				sources[field] = results[lists.findIndex((l) => l.length > 0)].source;
				continue;
			}
		}

		const hit = field === "genre" ? undefined : results.find((r) => hasValue(r.values[field]));
		if (hit) {
			(values as Record<string, unknown>)[field] = hit.values[field];
			sources[field] = hit.source;
		} else if (hasValue(ai[field])) {
			(values as Record<string, unknown>)[field] = ai[field];
			sources[field] = "ai";
		}
	}
	return { values, sources };
}
