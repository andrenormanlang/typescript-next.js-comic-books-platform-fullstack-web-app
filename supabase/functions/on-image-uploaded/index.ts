// Generates a 320px-wide JPEG thumbnail for images uploaded to the
// comics-images and avatars buckets (after-insert trigger on storage.objects,
// see supabase/migrations/20261104120200_listing_automation.sql).
//
// Output: <bucket>/thumbs/<name-without-extension>.jpg
// The frontend helper src/lib/storage/thumbnail.ts derives that URL and falls
// back to the original when a thumbnail doesn't exist.
//
// Free plan Edge Functions get ~2s of CPU per request, so large or exotic
// images (WebP/AVIF, which ImageScript can't decode) are skipped.

import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { supabaseAdmin } from "../_shared/admin.ts";
import { isInternalCall, json } from "../_shared/http.ts";
import { thumbPath } from "../_shared/thumbs.ts";

const BUCKETS = new Set(["comics-images", "avatars"]);
const MAX_BYTES = 4 * 1024 * 1024;
const WIDTH = 320;

Deno.serve(async (req) => {
	if (!isInternalCall(req)) return json({ error: "Forbidden" }, 403);

	const { bucket, name, mimetype, size } = await req.json().catch(() => ({}));
	if (typeof bucket !== "string" || typeof name !== "string") return json({ error: "Missing bucket/name" }, 400);
	if (!BUCKETS.has(bucket) || name.startsWith("thumbs/")) return json({ skipped: "not a source image" });
	if (mimetype && !/^image\/(jpe?g|png)$/.test(mimetype)) return json({ skipped: `unsupported ${mimetype}` });
	if (typeof size === "number" && size > MAX_BYTES) return json({ skipped: "too large" });

	const { data: file, error } = await supabaseAdmin.storage.from(bucket).download(name);
	if (error || !file) return json({ error: error?.message ?? "Download failed" }, 404);

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (bytes.length > MAX_BYTES) return json({ skipped: "too large" });

	let thumb: Uint8Array;
	try {
		const image = await Image.decode(bytes);
		if (image.width > WIDTH) image.resize(WIDTH, Image.RESIZE_AUTO);
		thumb = await image.encodeJPEG(75);
	} catch (err) {
		console.warn(`Could not thumbnail ${bucket}/${name}:`, (err as Error).message);
		return json({ skipped: "decode failed" });
	}

	const path = thumbPath(name);
	const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, thumb, {
		contentType: "image/jpeg",
		cacheControl: "31536000",
		upsert: true,
	});
	if (uploadError) {
		console.error(`Uploading ${bucket}/${path} failed:`, uploadError);
		return json({ error: uploadError.message }, 500);
	}

	return json({ thumbnail: `${bucket}/${path}` });
});
