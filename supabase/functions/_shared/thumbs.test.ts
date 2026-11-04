import { assertEquals } from "jsr:@std/assert@1";
import { thumbPath } from "./thumbs.ts";
import { getThumbnailUrl } from "../../../src/lib/storage/thumbnail.ts";

const base = "https://ref.supabase.co/storage/v1/object/public";

Deno.test("frontend URL matches the path the Edge Function writes", () => {
	for (const [bucket, name] of [
		["comics-images", "4d9d554c-136d-412f-a4fe-1118162f6d2b.jpg"],
		["comics-images", "aa265ca2.webp"],
		["avatars", "user/123/me.PNG"],
		["avatars", "no-extension"],
	]) {
		assertEquals(getThumbnailUrl(`${base}/${bucket}/${name}`), `${base}/${bucket}/${thumbPath(name)}`);
	}
});

Deno.test("non-storage and already-thumbnail URLs", () => {
	assertEquals(getThumbnailUrl("https://example.com/cover.jpg"), null);
	assertEquals(getThumbnailUrl(null), null);
	const thumb = `${base}/comics-images/thumbs/a.jpg`;
	assertEquals(getThumbnailUrl(thumb), thumb);
});
