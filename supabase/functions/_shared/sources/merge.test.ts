import { assertEquals } from "jsr:@std/assert@1";
import { isBrazilian, mergeValues, sourceOrder } from "./merge.ts";
import type { SourceResult } from "./types.ts";

Deno.test("source order depends on the edition's origin", () => {
	assertEquals(sourceOrder({ language: "pt", country: "", publisher: "" }), ["guia", "comicvine"]);
	assertEquals(sourceOrder({ language: "", country: "BR", publisher: "" }), ["guia", "comicvine"]);
	assertEquals(sourceOrder({ language: "", country: "", publisher: "Editora Abril" }), ["guia", "comicvine"]);
	assertEquals(sourceOrder({ language: "en", country: "US", publisher: "Image Comics" }), ["metron", "comicvine"]);
	assertEquals(isBrazilian({ language: "es", country: "AR", publisher: "Columba" }), false);
});

Deno.test("merge: first database with a value wins, Gemini fills the rest, genre from Gemini", () => {
	const results: SourceResult[] = [
		{ source: "metron", url: "m", values: { title: "Saga #1", pages: 52, main_writer: "Brian K. Vaughan", main_artist: "" } },
		{ source: "comicvine", url: "c", values: { title: "Saga #1 (CV)", main_artist: "Fiona Staples", pages: 0 } },
	];
	const ai = { title: "Saga 1", genre: "Science Fiction", main_artist: "Someone", description: "<p>AI</p>", pages: 40 };

	const { values, sources } = mergeValues(
		["title", "genre", "pages", "main_writer", "main_artist", "description", "publisher"],
		results,
		ai,
	);

	assertEquals(values, {
		title: "Saga #1",
		genre: "Science Fiction",
		pages: 52,
		main_writer: "Brian K. Vaughan",
		main_artist: "Fiona Staples", // Metron had it empty → Comic Vine
		description: "<p>AI</p>",
	});
	assertEquals(sources, {
		title: "metron",
		genre: "ai",
		pages: "metron",
		main_writer: "metron",
		main_artist: "comicvine",
		description: "ai",
	});
});

Deno.test("merge returns only the requested fields", () => {
	const results: SourceResult[] = [{ source: "guia", url: null, values: { title: "X nº 1", main_writer: "Stan Lee" } }];
	const { values, sources } = mergeValues(["main_writer"], results, { title: "AI title" });
	assertEquals(values, { main_writer: "Stan Lee" });
	assertEquals(sources, { main_writer: "guia" });
});
