import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const METRON_MAX_LIMIT = 200;
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

interface MetronsSeriesItem {
	id: number;
	name: string;
	issueCount: number;
}

interface MetronSeriesResponse {
	items?: MetronsSeriesItem[];
	total?: number;
	limit?: number;
	offset?: number;
	has_next?: boolean;
}

// Map Metron series to legacy Marvel format
function mapSeriesToLegacy(series: MetronsSeriesItem) {
	const issueCount = series.issueCount || 0;
	const comicsItems = issueCount
		? [
				{
					resourceURI: `${API_BASE_URL}/v1/series/${series.id}`,
					name: `${issueCount} issues in this series`,
				},
			]
		: [];

	return {
		id: series.id,
		title: series.name,
		description: `${issueCount} issues`,
		resourceURI: `${API_BASE_URL}/v1/series/${series.id}`,
		urls: [
			{
				type: "detail",
				url: `https://www.marvel.com/search?q=${encodeURIComponent(series.name)}`,
			},
		],
		modified: new Date().toISOString(),
		start: "",
		end: "",
		thumbnail: FALLBACK_THUMBNAIL,
		creators: { available: 0, collectionURI: "", items: [], returned: 0 },
		characters: { available: 0, collectionURI: "", items: [], returned: 0 },
		stories: { available: 0, collectionURI: "", items: [], returned: 0 },
		comics: {
			available: issueCount,
			collectionURI: `${API_BASE_URL}/v1/series/${series.id}`,
			items: comicsItems,
			returned: comicsItems.length,
		},
		series: [],
		next: null,
		previous: null,
	};
}

async function fetchSeriesPage(limit: number, offset: number): Promise<MetronSeriesResponse> {
	const response = await fetch(`${API_BASE_URL}/v1/series?limit=${limit}&offset=${offset}`);

	if (!response.ok) {
		throw new Error(`Metron API call failed with status: ${response.status}`);
	}

	return (await response.json()) as MetronSeriesResponse;
}

async function fetchAllSeries(): Promise<MetronsSeriesItem[]> {
	const allItems: MetronsSeriesItem[] = [];
	let offset = 0;

	while (true) {
		const page = await fetchSeriesPage(METRON_MAX_LIMIT, offset);
		const items = page.items || [];

		allItems.push(...items);

		if (!page.has_next || items.length === 0) {
			break;
		}

		offset += page.limit || METRON_MAX_LIMIT;
	}

	return allItems;
}

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const page = parseInt(urlParams.get("page") || "1", 10);
	const limit = parseInt(urlParams.get("limit") || "20", 10);
	const searchTerm = (urlParams.get("query") || "").trim().toLowerCase();

	const offset = (page - 1) * limit;

	try {
		if (searchTerm) {
			const allItems = await fetchAllSeries();
			const filteredItems = allItems.filter((item) => (item.name || "").toLowerCase().includes(searchTerm));
			const pagedItems = filteredItems.slice(offset, offset + limit);
			const results = pagedItems.map(mapSeriesToLegacy);

			const data = {
				data: {
					offset,
					limit,
					total: filteredItems.length,
					count: results.length,
					results,
				},
			};

			return new NextResponse(JSON.stringify(data), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		const metronData = await fetchSeriesPage(limit, offset);
		const results = (metronData.items || []).map(mapSeriesToLegacy);

		const data = {
			data: {
				offset: metronData.offset || offset,
				limit: metronData.limit || limit,
				total: metronData.total || 0,
				count: results.length,
				results,
			},
		};

		return new NextResponse(JSON.stringify(data), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "An unknown error occurred";
		return new NextResponse(
			JSON.stringify({
				error: message,
				data: {
					offset: (page - 1) * limit,
					limit,
					total: 0,
					count: 0,
					results: [],
				},
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}
}
