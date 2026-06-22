export interface DigestSource {
	title: string;
	url: string;
}

export interface DigestHighlight {
	publisher: string;
	topic: string;
	headline: string;
	summary: string;
	sources: DigestSource[];
}

export interface Digest {
	digestDate: string; // YYYY-MM-DD (Europe/Stockholm)
	coverageStartTS: number;
	coverageEndTS: number;
	model: string;
	articleCount: number;
	sourceCount: number;
	highlights: DigestHighlight[];
}
