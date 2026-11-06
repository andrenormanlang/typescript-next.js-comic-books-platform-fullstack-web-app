// Dropdown options for the sell and edit listing forms.
// Mirrored in supabase/functions/_shared/comic-options.ts for the analyze-cover
// Edge Function; supabase/functions/_shared/comic-options.test.ts checks the
// two copies match.

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

export const CURRENCIES = [
	{ value: "BRL", label: "Brazilian Real (BRL)" },
	{ value: "DKK", label: "Danish Krone (DKK)" },
	{ value: "SEK", label: "Swedish Krona (SEK)" },
	{ value: "USD", label: "US Dollar (USD)" },
	{ value: "EUR", label: "Euro (EUR)" },
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

// Fields the analyze-cover Edge Function can fill from a cover photo.
// Price, quantity and currency are the seller's decision and never auto-filled.
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

export const COVER_SOURCE_LABELS: Record<CoverSource, string> = {
	guia: "Guia",
	comicvine: "Comic Vine",
	metron: "Metron",
	fandom: "Fandom",
	ai: "AI",
};

// Publisher dropdown plus any extra values (an AI-found publisher, or one
// already saved on the listing) so the select can show them.
export function publisherOptions(...extra: Array<string | null | undefined>): string[] {
	const options = [...PUBLISHERS];
	for (const value of extra) {
		if (value && !options.includes(value)) options.push(value);
	}
	return options;
}
