import type { CoverField, CoverSource, CoverValues } from "../comic-options.ts";

/** What Gemini read off the cover; drives which databases are asked. */
export type Identification = {
	series: string;
	issue: string;
	publisher: string;
	year: number | null;
	language: string; // ISO 639-1, e.g. "pt", "en"
	country: string; // ISO 3166-1 alpha-2 if known, e.g. "BR", "US"
};

export type SourceResult = {
	source: Exclude<CoverSource, "ai">;
	url: string | null;
	values: Partial<CoverValues>;
};

/** A database adapter. Returns null for "no confident match" or any failure. */
export type SourceAdapter = (id: Identification, signal: AbortSignal) => Promise<SourceResult | null>;

export type MergeResult = {
	values: Partial<CoverValues>;
	sources: Partial<Record<CoverField, CoverSource>>;
};
