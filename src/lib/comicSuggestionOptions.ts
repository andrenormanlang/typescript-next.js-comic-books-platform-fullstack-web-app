export const comicGenres = [
	"Superhero",
	"Science Fiction",
	"Fantasy",
	"Horror",
	"Crime/Noir",
	"Action/Adventure",
	"Slice of Life",
	"Romance",
	"Historical",
	"Western",
	"Manga",
	"Comedy",
	"Drama",
] as const;

export const comicStyles = [
	"Golden Age",
	"Silver Age",
	"Bronze Age",
	"Modern Age",
	"Manga",
	"European",
	"Underground/Alternative",
	"Webcomic",
	"Graphic Novel",
	"Indie",
	"Cartoon",
	"Realistic",
] as const;

export const experienceLevels = [
	"Beginner - Never read comics before",
	"Casual - Read a few comics",
	"Intermediate - Regular comic reader",
	"Advanced - Extensive comic knowledge",
	"Expert - Comic collector/enthusiast",
] as const;

export const purposes = [
	"Entertainment",
	"Learning about comics",
	"Research",
	"Gift ideas",
	"Collection expansion",
	"Inspiration for my own work",
] as const;

export type ComicGenre = (typeof comicGenres)[number];
export type ComicStyle = (typeof comicStyles)[number];
export type ExperienceLevel = (typeof experienceLevels)[number];
export type Purpose = (typeof purposes)[number];
