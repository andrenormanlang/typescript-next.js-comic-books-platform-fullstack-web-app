import { assertEquals } from "jsr:@std/assert@1";
import { buildFactSheet, hasCollectorFacts, toCollectorHtml } from "./collector-description.ts";
import { combineNames, comicEra, splitNames } from "./cover-text.ts";
import { mergeValues, sourceOrder } from "./sources/merge.ts";
import type { SourceResult } from "./sources/types.ts";

// Daredevil #183 as the three databases describe it.
const RESULTS: SourceResult[] = [
	{
		source: "metron",
		url: "m",
		values: { main_writer: "Roger McKenzie", main_artist: "Frank Miller" },
		facts: { writers: ["Roger McKenzie"], artists: ["Frank Miller"], coverPrice: "0.60 USD", synopsis: "When a young girl dies..." },
	},
	{
		source: "comicvine",
		url: "c",
		values: { main_writer: "Frank Miller, Roger McKenzie", main_artist: "Frank Miller" },
		facts: { writers: ["Frank Miller", "Roger McKenzie"], artists: ["Frank Miller"], characters: ["Punisher", "Daredevil"] },
	},
	{
		source: "fandom",
		url: "f",
		values: {},
		facts: { writers: ["Roger McKenzie", "Frank Miller"], notes: ["First meeting between Daredevil and Punisher"] },
	},
];

Deno.test("writer/artist combine every database's names, deduplicated", () => {
	const { values, sources } = mergeValues(["main_writer", "main_artist"], RESULTS, { main_writer: "AI guess" });
	assertEquals(values.main_writer, "Roger McKenzie, Frank Miller");
	assertEquals(values.main_artist, "Frank Miller");
	assertEquals(sources.main_writer, "metron");
});

Deno.test("Fandom is asked for Marvel/DC covers only, never for Brazilian editions", () => {
	assertEquals(sourceOrder({ language: "en", country: "US", publisher: "Marvel" }), ["metron", "comicvine", "fandom"]);
	assertEquals(sourceOrder({ language: "en", country: "US", publisher: "DC Comics" }), ["metron", "comicvine", "fandom"]);
	assertEquals(sourceOrder({ language: "en", country: "US", publisher: "Image Comics" }), ["metron", "comicvine"]);
	assertEquals(sourceOrder({ language: "pt", country: "BR", publisher: "Editora Abril" }), ["guia", "comicvine"]);
});

Deno.test("fact sheet merges facts and computes era + cover price in code", () => {
	const sheet = buildFactSheet({
		title: "Daredevil #183",
		releaseDate: "1982-06-01",
		writers: "Roger McKenzie, Frank Miller",
		language: "en",
		sources: RESULTS,
	});
	assertEquals(sheet.era, "Bronze Age");
	assertEquals(sheet.cover_price, "0.60 USD");
	assertEquals(sheet.notable_notes, ["First meeting between Daredevil and Punisher"]);
	assertEquals(sheet.characters, ["Punisher", "Daredevil"]);
	assertEquals(sheet.synopses.map((s) => s.source), ["metron"]);
	assertEquals(hasCollectorFacts(sheet), true);
	assertEquals(hasCollectorFacts(buildFactSheet({ title: "X #1", language: "en", sources: [] })), false);
});

Deno.test("collector HTML: story paragraph + notes list, escaped, localized heading", () => {
	assertEquals(
		toCollectorHtml("Matt & Frank clash.", ["First meeting <DD/Punisher>"], "en"),
		"<p>Matt &amp; Frank clash.</p><p><strong>Collector notes</strong></p><ul><li><p>First meeting &lt;DD/Punisher&gt;</p></li></ul>",
	);
	assertEquals(toCollectorHtml("História.", ["Nota"], "pt-BR").includes("Notas para colecionadores"), true);
	assertEquals(toCollectorHtml("Only story.", [], "en"), "<p>Only story.</p>");
});

Deno.test("era, name splitting and combining", () => {
	assertEquals(comicEra(1962), "Silver Age");
	assertEquals(comicEra(1982), "Bronze Age");
	assertEquals(comicEra(1939), "Golden Age");
	assertEquals(comicEra(2012), "Modern Age");
	assertEquals(comicEra(null), "");
	assertEquals(splitNames("Stan Lee / Jack Kirby"), ["Stan Lee", "Jack Kirby"]);
	assertEquals(splitNames("Lee e Kirby"), ["Lee", "Kirby"]);
	assertEquals(combineNames([["Frank Miller"], ["frank miller", "Klaus Janson"], ["A", "B", "C"]]), ["Frank Miller", "Klaus Janson", "A"]);
});
