// Must stay in sync with src/lib/storage/thumbnail.ts (see thumbs.test.ts).
export function thumbPath(name: string): string {
	const base = name.replace(/\.[^./]+$/, "");
	return `thumbs/${base}.jpg`;
}
