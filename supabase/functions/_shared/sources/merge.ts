import { normalizeKey, type CoverField, type CoverValues } from "../comic-options.ts";
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

/** Which databases to ask, in order. Gemini ("ai") is always the last resort. */
export function sourceOrder(id: Pick<Identification, "language" | "country" | "publisher">): DbSource[] {
	return isBrazilian(id) ? ["guia", "comicvine"] : ["metron", "comicvine"];
}

const hasValue = (v: unknown) => (typeof v === "number" ? v > 0 : typeof v === "string" ? v.trim() !== "" : false);

/**
 * For each requested field: the first database result (callers pass results in
 * sourceOrder) with a value wins; otherwise Gemini's value. Genre always comes
 * from Gemini: no database uses the form's genre list.
 */
export function mergeValues(
	fields: readonly CoverField[],
	results: SourceResult[],
	ai: Partial<CoverValues>,
): MergeResult {
	const values: Partial<CoverValues> = {};
	const sources: MergeResult["sources"] = {};

	for (const field of fields) {
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
