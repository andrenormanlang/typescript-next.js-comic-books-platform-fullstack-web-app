import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

type MarvelMetadataIssue = {
	id: number;
	title?: string | null;
	issueNumber?: string | null;
	description?: string | null;
	modified?: string | null;
	pageCount?: number | null;
	detailUrl?: string | null;
	seriesId?: number | null;
	seriesName?: string | null;
	onSaleDate?: string | null;
	unlimitedDate?: string | null;
	cover?: {
		path?: string | null;
		extension?: string | null;
	} | null;
};

function mapIssueToLegacyComic(issue: MarvelMetadataIssue) {
	const coverPath = issue.cover?.path?.replace("http://", "https://") || FALLBACK_THUMBNAIL.path;
	const coverExtension = issue.cover?.extension || FALLBACK_THUMBNAIL.extension;

	return {
		id: issue.id,
		digitalId: null,
		title: issue.title || "Untitled",
		issueNumber: issue.issueNumber || null,
		variantDescription: "",
		description: issue.description || "",
		modified: issue.modified || null,
		isbn: "",
		upc: "",
		diamondCode: "",
		ean: "",
		issn: "",
		format: "Comic",
		pageCount: issue.pageCount ?? 0,
		textObjects: [],
		resourceURI: issue.id ? `/v1/issues/${issue.id}` : "",
		urls: issue.detailUrl
			? [
					{
						type: "detail",
						url: issue.detailUrl,
					},
				]
			: [],
		series: {
			resourceURI: issue.seriesId ? `/v1/series/${issue.seriesId}` : "",
			name: issue.seriesName || "Unknown Series",
		},
		variants: [],
		collections: [],
		collectedIssues: [],
		dates: [
			{
				type: "onsaleDate",
				date: issue.onSaleDate || new Date().toISOString(),
			},
			{
				type: "unlimitedDate",
				date: issue.unlimitedDate || issue.onSaleDate || new Date().toISOString(),
			},
		],
		prices: [],
		thumbnail: {
			path: coverPath,
			extension: coverExtension,
		},
		images: [
			{
				path: coverPath,
				extension: coverExtension,
			},
		],
		creators: {
			available: 0,
			collectionURI: "",
			items: [],
			returned: 0,
		},
		characters: {
			available: 0,
			collectionURI: "",
			items: [],
			returned: 0,
		},
		stories: {
			available: 0,
			collectionURI: "",
			items: [],
			returned: 0,
		},
		events: {
			available: 0,
			collectionURI: "",
			items: [],
			returned: 0,
		},
	};
}

async function fetchIssueWithCover(issue: MarvelMetadataIssue): Promise<MarvelMetadataIssue> {
	if (!issue?.id) {
		return issue;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/v1/issues/${issue.id}`);
		if (!response.ok) {
			return issue;
		}

		const detail = (await response.json()) as MarvelMetadataIssue;
		return {
			...issue,
			cover: detail.cover ?? issue.cover,
			description: detail.description ?? issue.description,
			modified: detail.modified ?? issue.modified,
			pageCount: detail.pageCount ?? issue.pageCount,
		};
	} catch {
		return issue;
	}
}

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const page = parseInt(urlParams.get("page") || "1", 10);
	const limit = parseInt(urlParams.get("limit") || "20", 10);
	const searchTerm = (urlParams.get("query") || "").trim();
	const offset = (page - 1) * limit;

	const hasSearchQuery = searchTerm.length >= 2;
	const apiUrl = hasSearchQuery
		? `${API_BASE_URL}/v1/search/issues?q=${encodeURIComponent(searchTerm)}&limit=${limit}`
		: `${API_BASE_URL}/v1/issues?limit=${limit}&offset=${offset}`;

	if (searchTerm.length === 1) {
		return new NextResponse(
			JSON.stringify({
				data: {
					total: 0,
					count: 0,
					offset,
					limit,
					results: [],
				},
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error(`Marvel API call failed with status: ${response.status}`);
		}

		const payload = await response.json();
		const baseItems = Array.isArray(payload.items) ? (payload.items as MarvelMetadataIssue[]) : [];
		const itemsWithCover = await Promise.all(baseItems.map(fetchIssueWithCover));
		const mappedResults = itemsWithCover.map(mapIssueToLegacyComic);

		const normalized = {
			data: {
				total: hasSearchQuery
					? (payload.count ?? mappedResults.length)
					: (payload.total ?? mappedResults.length),
				count: mappedResults.length,
				offset: hasSearchQuery ? 0 : (payload.offset ?? offset),
				limit: payload.limit ?? limit,
				results: mappedResults,
			},
		};

		return new NextResponse(JSON.stringify(normalized), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "An unknown error occurred";
		return new NextResponse(JSON.stringify({ error: message }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
}
