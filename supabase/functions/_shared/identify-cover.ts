// Gemini step of analyze-cover: identify a comic from its cover photo and
// guess every form field. Separate from the HTTP handler so it can be tried
// directly, e.g. from a local Deno script.

import { generateJson, type InlineImage } from "./gemini.ts";
import { clampPages, GENRES, normalizeGenre, normalizePublisher, type CoverValues } from "./comic-options.ts";
import { normalizeDate, toParagraphs } from "./cover-text.ts";

export type GeminiCover = {
	is_comic_cover: boolean;
	confidence: number;
	series: string;
	issue_number: string;
	cover_year: number;
	language: string;
	country: string;
	title: string;
	publisher: string;
	genre: string;
	release_date: string;
	pages: number;
	main_writer: string;
	main_artist: string;
	description: string;
};

const COVER_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		is_comic_cover: { type: "boolean" },
		confidence: { type: "number", minimum: 0, maximum: 1 },
		series: { type: "string" },
		issue_number: { type: "string" },
		cover_year: { type: "integer" },
		language: { type: "string" },
		country: { type: "string" },
		title: { type: "string" },
		publisher: { type: "string" },
		genre: { type: "string", enum: [...GENRES, ""] },
		release_date: { type: "string" },
		pages: { type: "integer" },
		main_writer: { type: "string" },
		main_artist: { type: "string" },
		description: { type: "string" },
	},
	required: [
		"is_comic_cover", "confidence", "series", "issue_number", "cover_year", "language", "country",
		"title", "publisher", "genre", "release_date", "pages", "main_writer", "main_artist", "description",
	],
};

const SYSTEM =
	"You identify comic books from photos of their covers for a second-hand marketplace. " +
	"Output ONLY a JSON object matching the schema. Use an empty string or 0 for anything you don't know; never invent credits.";

function buildPrompt(context: Partial<CoverValues>): string {
	const lines = [
		"Identify the comic book in this cover photo.",
		"- series: the series name as printed (no issue number). issue_number: digits only.",
		"- cover_year: year printed or implied by the cover, 0 if unknown.",
		"- language: ISO 639-1 code of the cover text (e.g. pt, en). country: ISO 3166-1 alpha-2 of the edition (e.g. BR, US).",
		"- title: \"<series> #<issue_number>\" (for Brazilian editions you may use \"<series> nº <n>\").",
		"- publisher: the publisher of THIS edition (e.g. Editora Abril for a Brazilian Abril edition).",
		"- genre: the best match from the allowed list.",
		"- release_date: YYYY-MM-DD; use day 01 (and month 01) when unknown; empty if the year is unknown.",
		"- pages: page count of this edition if you know it, else 0.",
		"- main_writer / main_artist: the lead writer and lead penciller of the main story, empty if unsure.",
		"- description: 2-4 sentences describing the issue for a buyer, in the language of the cover, no spoilers beyond the solicitation.",
		"- is_comic_cover: false if this is not a comic book cover. confidence: 0-1 for the identification.",
	];
	const given = Object.entries(context).filter(([, v]) => v !== undefined && v !== "" && v !== 0);
	if (given.length) {
		lines.push("", "The seller has already entered these values. Treat them as correct and stay consistent with them:");
		for (const [k, v] of given) lines.push(`- ${k}: ${String(v).replace(/<[^>]+>/g, " ").slice(0, 300)}`);
	}
	return lines.join("\n");
}

export async function identifyCover(image: InlineImage, context: Partial<CoverValues>): Promise<GeminiCover> {
	const { text } = await generateJson({ prompt: buildPrompt(context), schema: COVER_SCHEMA, image, system: SYSTEM });
	return JSON.parse(text) as GeminiCover;
}

export function aiValues(g: GeminiCover): Partial<CoverValues> {
	return {
		title: g.title?.trim() || (g.series && g.issue_number ? `${g.series} #${g.issue_number}` : ""),
		publisher: normalizePublisher(g.publisher),
		genre: normalizeGenre(g.genre),
		release_date: normalizeDate(g.release_date),
		pages: clampPages(g.pages),
		main_writer: g.main_writer?.trim() ?? "",
		main_artist: g.main_artist?.trim() ?? "",
		description: g.description ? toParagraphs(g.description) : "",
	};
}
