// Thumbnails are written by the on-image-uploaded Edge Function to
// <bucket>/thumbs/<name-without-extension>.jpg. Not every image has one
// (older uploads, WebP/AVIF, very large files), so callers must fall back to
// the original URL on error.

const THUMB_BUCKETS = ["comics-images", "avatars"];

export function getThumbnailUrl(publicUrl: string | null | undefined): string | null {
	if (!publicUrl) return null;

	for (const bucket of THUMB_BUCKETS) {
		const marker = `/storage/v1/object/public/${bucket}/`;
		const at = publicUrl.indexOf(marker);
		if (at === -1) continue;

		const name = publicUrl.slice(at + marker.length).split("?")[0];
		if (name.startsWith("thumbs/")) return publicUrl;

		const base = name.replace(/\.[^./]+$/, "");
		return `${publicUrl.slice(0, at + marker.length)}thumbs/${base}.jpg`;
	}

	return null; // not a Supabase Storage URL we thumbnail
}
