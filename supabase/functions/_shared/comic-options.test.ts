import { assertEquals } from "jsr:@std/assert@1";
import * as fn from "./comic-options.ts";
import * as app from "../../../src/lib/comicFormOptions.ts";

Deno.test("Edge Function option lists match the app's form options", () => {
	assertEquals(fn.PUBLISHERS, app.PUBLISHERS);
	assertEquals(fn.GENRES, app.GENRES);
	assertEquals([...fn.COVER_FIELDS], [...app.COVER_FIELDS]);
});
