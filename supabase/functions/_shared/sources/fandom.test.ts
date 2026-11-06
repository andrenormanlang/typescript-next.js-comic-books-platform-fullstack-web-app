import { assertEquals } from "jsr:@std/assert@1";
import { parseFandomWikitext, wikiToText } from "./fandom.ts";

// Shape of marvel.fandom.com "Daredevil Vol 1 183" (Marvel Database:Comic Template), trimmed.
const PAGE = `{{Marvel Database:Comic Template
| Month                   = June
| Year                    = 1982
| StoryTitle1             = Child's Play
| Synopsis1               = A young girl on drugs takes a dive out of her school window and dies, and her brother, [[Matthew Murdock (Earth-616)|DD]] and the [[Francis Castle (Earth-616)|Punisher]] are all trying to track down the dealer responsible.
| Writer1_1               = Roger McKenzie
| Writer1_2               = Frank Miller
| Penciler1_1             = Frank Miller
| Inker1_1                = Klaus Janson
| Appearing1              =
'''Featured Characters:'''
* {{a|[[Matthew Murdock (Earth-616)|Daredevil]]}}
* {{1st|[[Hogman (Earth-616)|Hogman]]}}
| Notes                   =

* This issue was originally meant to be published in {{cl|Daredevil Vol 1 167}}, but ran afoul of the comics code.  It was re-worked and presented here under Code guidelines.

* First meeting between [[Matthew Murdock (Earth-616)|Daredevil]] and [[Francis Castle (Earth-616)|Punisher]]

* This issue includes the letters page, ''Devil's Advocate''.
| Trivia                  =

* [[Lucas Cage (Earth-616)|Luke Cage]] and [[Khan (Earth-616)|Master Khan]] also enjoy the atmosphere at ''Poppa's Olympian Palace''.

| Recommended             =
}}`;

Deno.test("parses a Fandom comic page into collector facts", () => {
	const p = parseFandomWikitext(PAGE);
	assertEquals(p.year, 1982);
	assertEquals(p.releaseDate, "1982-06-01");
	assertEquals(p.facts.storyTitles, ["Child's Play"]);
	assertEquals(p.facts.writers, ["Roger McKenzie", "Frank Miller"]);
	assertEquals(p.facts.artists, ["Frank Miller"]); // inker not included
	assertEquals(p.facts.firstAppearances, ["Hogman"]);
	assertEquals(p.facts.notes, [
		"This issue was originally meant to be published in Daredevil #167, but ran afoul of the comics code. It was re-worked and presented here under Code guidelines.",
		"First meeting between Daredevil and Punisher",
	]);
	assertEquals(p.facts.trivia, ["Luke Cage and Master Khan also enjoy the atmosphere at Poppa's Olympian Palace."]);
	assertEquals(
		p.facts.synopsis?.startsWith("A young girl on drugs takes a dive out of her school window and dies, and her brother, DD and the Punisher"),
		true,
	);
});

Deno.test("wikiToText cleans links, issue templates and universes", () => {
	assertEquals(wikiToText("{{cl|Daredevil Vol 1 167}}"), "Daredevil #167");
	assertEquals(wikiToText("[[Peter Parker (Earth-616)|Spider-Man]] meets {{a|[[Thor]]}}"), "Spider-Man meets");
	assertEquals(wikiToText("''Bold'' '''text'''"), "Bold text");
});

Deno.test("missing fields don't break parsing", () => {
	const p = parseFandomWikitext("{{Marvel Database:Comic Template\n| Year = 1962\n}}");
	assertEquals(p.year, 1962);
	assertEquals(p.facts.writers, []);
	assertEquals(p.facts.notes, []);
	assertEquals(p.facts.synopsis, undefined);
});
