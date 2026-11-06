// Mirror of src/lib/comicFormOptions.ts (the Edge Function can't import from
// the Next.js app at deploy time). comic-options.test.ts keeps them in sync.

export const PUBLISHERS = [
	"Marvel Comics",
	"Editora Abril",
	"DC Comics",
	"Vertigo",
	"Image Comics",
	"Dark Horse Comics",
	"IDW Publishing",
	"Valiant Comics",
	"Dynamite Entertainment",
	"Boom! Studios",
];

export const GENRES = [
	"Superhero",
	"Science Fiction",
	"Fantasy",
	"Horror",
	"Mystery/Crime",
	"Romance",
	"Comedy/Humor",
	"Drama",
	"Historical",
	"Slice of Life",
	"Adventure",
	"Thriller/Suspense",
	"Western",
	"War/Military",
	"Biographical/Autobiographical",
	"Educational/Non-Fiction",
	"Anthology",
];

export const COVER_FIELDS = [
	"title",
	"publisher",
	"genre",
	"release_date",
	"pages",
	"main_artist",
	"main_writer",
	"description",
] as const;

export type CoverField = (typeof COVER_FIELDS)[number];
export type CoverSource = "guia" | "comicvine" | "metron" | "fandom" | "ai";

export type CoverValues = {
	title: string;
	publisher: string;
	genre: string;
	release_date: string; // YYYY-MM-DD
	pages: number;
	main_artist: string;
	main_writer: string;
	description: string; // HTML (<p> paragraphs) for the rich-text editor
};

// Names sources use → the form's dropdown value. Keys are compared after
// normalizeKey(). Unknown publishers are kept as-is (the column is free text).
const PUBLISHER_ALIASES: Record<string, string> = {
	marvel: "Marvel Comics",
	"marvel comics": "Marvel Comics",
	"marvel comics group": "Marvel Comics",
	abril: "Editora Abril",
	"editora abril": "Editora Abril",
	"abril jovem": "Editora Abril",
	dc: "DC Comics",
	"dc comics": "DC Comics",
	"national periodical publications": "DC Comics",
	vertigo: "Vertigo",
	"dc vertigo": "Vertigo",
	image: "Image Comics",
	"image comics": "Image Comics",
	"dark horse": "Dark Horse Comics",
	"dark horse comics": "Dark Horse Comics",
	idw: "IDW Publishing",
	"idw publishing": "IDW Publishing",
	valiant: "Valiant Comics",
	"valiant comics": "Valiant Comics",
	"valiant entertainment": "Valiant Comics",
	dynamite: "Dynamite Entertainment",
	"dynamite entertainment": "Dynamite Entertainment",
	boom: "Boom! Studios",
	"boom studios": "Boom! Studios",
};

export function normalizeKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function normalizePublisher(name: string | null | undefined): string {
	const trimmed = (name ?? "").trim();
	if (!trimmed) return "";
	return PUBLISHER_ALIASES[normalizeKey(trimmed)] ?? trimmed;
}

export function normalizeGenre(value: string | null | undefined): string {
	const key = normalizeKey(value ?? "");
	return GENRES.find((g) => normalizeKey(g) === key) ?? "";
}

export function clampPages(value: unknown): number {
	const n = Math.round(Number(value));
	return Number.isFinite(n) && n >= 1 && n <= 2000 ? n : 0;
}
