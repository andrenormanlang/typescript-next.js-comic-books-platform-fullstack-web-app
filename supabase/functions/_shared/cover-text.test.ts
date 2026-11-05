import { assertEquals, assert } from "jsr:@std/assert@1";
import {
	htmlToText,
	nameSimilarity,
	normalizeDate,
	parseTitle,
	pickBest,
	scoreCandidate,
	toDescription,
	truncateAtSentence,
} from "./cover-text.ts";
import { clampPages, normalizeGenre, normalizePublisher } from "./comic-options.ts";

Deno.test("normalizeDate handles every source format", () => {
	assertEquals(normalizeDate("2012-03-01"), "2012-03-01"); // Metron / Comic Vine
	assertEquals(normalizeDate("2012-03"), "2012-03-01");
	assertEquals(normalizeDate("15/07/1986"), "1986-07-15");
	assertEquals(normalizeDate("março de 1986"), "1986-03-01"); // Guia
	assertEquals(normalizeDate("Março 1986"), "1986-03-01");
	assertEquals(normalizeDate("Dezembro de 1979"), "1979-12-01");
	assertEquals(normalizeDate("1986"), "1986-01-01");
	assertEquals(normalizeDate("março"), ""); // month without year
	assertEquals(normalizeDate(""), "");
	assertEquals(normalizeDate("2012-13-01"), "");
});

Deno.test("parseTitle splits series and issue", () => {
	assertEquals(parseTitle("Saga #1"), { series: "Saga", issue: "1" });
	assertEquals(parseTitle("Superaventuras Marvel nº 44"), { series: "Superaventuras Marvel", issue: "44" });
	assertEquals(parseTitle("X-Men 044"), { series: "X-Men", issue: "44" });
	assertEquals(parseTitle("Watchmen"), { series: "Watchmen", issue: "" });
});

Deno.test("candidate scoring: exact name + issue, then closest year", () => {
	const wanted = { series: "Saga", issue: "1", year: 2012 };
	const candidates = [
		{ name: "Megalith: The Olympus Saga", issue: "1", year: 2026 },
		{ name: "Saga", issue: "1", year: 2013 }, // German edition
		{ name: "Saga", issue: "1", year: 2012 }, // US original
		{ name: "Saga", issue: "2", year: 2012 },
	];
	assertEquals(pickBest(candidates, (c) => scoreCandidate(c, wanted)), candidates[2]);
	assertEquals(scoreCandidate(candidates[0], wanted), 0); // name too different
	assertEquals(scoreCandidate(candidates[3], wanted), 0); // wrong issue
});

Deno.test("name similarity ignores accents, case and leading articles", () => {
	assertEquals(nameSimilarity("Incrível Hulk, O", "incrivel hulk o"), 1);
	assertEquals(nameSimilarity("The Amazing Spider-Man", "Amazing Spider-Man"), 1);
	assert(nameSimilarity("Wolverine Saga", "Saga") < 0.75);
});

Deno.test("description HTML becomes short, safe paragraphs", () => {
	const html = '<p><em>Romeo &amp; Juliet</em> meets Star Wars.</p><script>alert(1)</script><p>Second <a href="x">part</a>.</p>';
	assertEquals(htmlToText(html), "Romeo & Juliet meets Star Wars.\nSecond part.");
	assertEquals(toDescription("<b>x</b> < y"), "<p>x &lt; y</p>");
	const long = "One sentence here. ".repeat(60);
	const cut = truncateAtSentence(long, 600);
	assert(cut.length <= 600 && cut.endsWith("."));
});

Deno.test("publisher, genre and pages normalisation", () => {
	assertEquals(normalizePublisher("Marvel"), "Marvel Comics");
	assertEquals(normalizePublisher("Abril"), "Editora Abril");
	assertEquals(normalizePublisher("BOOM! Studios"), "Boom! Studios");
	assertEquals(normalizePublisher("Archie Comics"), "Archie Comics"); // kept as-is
	assertEquals(normalizeGenre("science fiction"), "Science Fiction");
	assertEquals(normalizeGenre("Space Opera"), "");
	assertEquals(clampPages(52), 52);
	assertEquals(clampPages(0), 0);
	assertEquals(clampPages(99999), 0);
});
