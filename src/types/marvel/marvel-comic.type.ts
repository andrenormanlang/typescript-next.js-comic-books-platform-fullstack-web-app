export type ComicIssue = {
	id: number;
	digitalId: number;
	title: string;
	issueNumber: number;
	variantDescription: string;
	description: string;
	modified: string;
	isbn: string;
	upc: string;
	diamondCode: string;
	ean: string;
	issn: string;
	format: string;
	pageCount: number;
	textObjects: TextObject[];
	resourceURI: string;
	urls: MarvelComicURL[];
	series: ComicSeries;
	variants: ComicVariant[];
	collections: ComicCollection[];
	collectedIssues: any[];
	dates: ComicDate[];
	prices: ComicPrice[];
	thumbnail: ComicImage;
	images: ComicImage[];
	creators: ComicCreators;
	characters: ComicCharacters;
	stories: ComicStories;
	events: ComicEvents;
};

export type MarvelCharacter = {
	id: number;
	name: string;
	description: string;
	modified: string;
	thumbnail: ComicImage;
	resourceURI: string;
	comics: Comic;
	series: Series;
	stories: Stories;
	events: Event;
	urls: UrlItem[];
};

export type MarvelCreator = {
	id: number;
	firstName: string;
	middleName: string;
	lastName: string;
	suffix: string;
	fullName: string;
	description?: string;
	modified: string;
	thumbnail: ComicImage;
	resourceURI: string;
	comics: Comic;
	series: Series;
	stories: Stories;
	events: Event;
	urls: UrlItem[];
};

export type MarvelEvent = {
	id: number;
	title: string;
	description: string;
	resourceURI: string;
	urls: UrlItem[];
	modified: string;
	start: string;
	end: string;
	thumbnail: ComicImage;
	creators: CreatorItem[];
	characters: CharacterItem[];
	stories: StoryItems[];
	comics: ComicItem[];
	series: SeriesItem[];
	next: MarvelEventSummary;
	previous: MarvelEventSummary;
};

export type MarvelSeriesTypes = {
	id: number;
	title: string;
	description: string;
	resourceURI: string;
	urls: UrlItem[];
	modified: string;
	start: string;
	end: string;
	thumbnail: ComicImage;
	creators: CreatorItem[];
	characters: CharacterItem[];
	stories: StoryItems[];
	comics: ComicItem[];
	series: SeriesItem[];
	next: MarvelEventSummary;
	previous: MarvelEventSummary;
};

export type MarvelStory = {
	id: number;
	title: string;
	description: string;
	resourceURI: string;
	type: string;
	modified: string;
	thumbnail: string;
	creators: ComicCreators;
	characters: ComicCharacters;
	series: Series;
	comics: Comic;
	events: Event;
	originalIssue: OriginalIssue;
};

type TextObject = {
	type: string;
	language: string;
	text: string;
};

export type SeriesItem = {
	resourceURI: string;
	name: string;
};

type MarvelEventSummary = {
	resourceURI: string;
	name: string;
};

export type UrlItem = {
	type: string;
	url: string;
};

export type Series = {
	available: number;
	collectionURI: string;
	items: SeriesItem[];
	returned: number;
};

type Stories = {
	available: number;
	collectionURI: string;
	items: StoryItems[];
	returned: number;
};

type Event = {
	available: number;
	collectionURI: string;
	items: [];
	returned: number;
};

export type Comic = {
	available: number;
	collectionURI: string;
	items: ComicItem[];
	returned: number;
};

type MarvelComicURL = {
	type: string;
	url: string;
};

type ComicSeries = {
	resourceURI: string;
	name: string;
};

type ComicVariant = {
	resourceURI: string;
	name: string;
};

type ComicCollection = {
	resourceURI: string;
	name: string;
};

type ComicDate = {
	type: string;
	date: string;
};

export type CharacterItem = {
	resourceURI: string;
	name: string;
};
export type ComicItem = {
	resourceURI: string;
	name: string;
};
export type EventItem = {
	resourceURI: string;
	name: string;
};

type ComicPrice = {
	type: string;
	price: number;
};

type ComicImage = {
	path: string;
	extension: string;
};

type ComicCreators = {
	available: number;
	collectionURI: string;
	items: CreatorItem[];
	returned: number;
};

export type CreatorItem = {
	resourceURI: string;
	name: string;
	role: string;
};

type ComicCharacters = {
	available: number;
	collectionURI: string;
	items: CharacterItem[];
	returned: number;
};

type ComicStories = {
	available: number;
	collectionURI: string;
	items: StoryItems[];
	returned: number;
};

export type StoryItems = {
	resourceURI: string;
	name: string;
	type: string;
};

type ComicEvents = {
	available: number;
	collectionURI: string;
	items: any[];
	returned: number;
};

type OriginalIssue = {
	resourceURI: string;
	name: string;
};
