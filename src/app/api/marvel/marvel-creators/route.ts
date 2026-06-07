import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const METRON_MAX_LIMIT = 200;
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

interface MetronsCreatorItem {
	id: number;
	name: string;
	issueCount: number;
}

interface MetronCreatorsResponse {
	items?: MetronsCreatorItem[];
	total?: number;
	limit?: number;
	offset?: number;
	has_next?: boolean;
}

function splitCreatorName(name: string) {
	const cleanedName = (name || "").trim();
	const parts = cleanedName.split(/\s+/).filter(Boolean);

	if (parts.length <= 1) {
		return { firstName: cleanedName, lastName: "", fullName: cleanedName };
	}

	return {
		firstName: parts.slice(0, -1).join(" "),
		lastName: parts[parts.length - 1],
		fullName: cleanedName,
	};
}

// Map Metron creator to legacy Marvel format
function mapCreatorToLegacy(creator: MetronsCreatorItem) {
	const issueCount = creator.issueCount || 0;
	const name = splitCreatorName(creator.name);

	return {
		id: creator.id,
		firstName: name.firstName,
		lastName: name.lastName,
		fullName: name.fullName,
		suffix: "",
		middleName: "",
		description: `${issueCount} issues`,
		resourceURI: `${API_BASE_URL}/v1/creators/${creator.id}`,
		urls: [
			{
				type: "detail",
				url: `https://www.marvel.com/search?q=${encodeURIComponent(creator.name)}`,
			},
		],
		modified: new Date().toISOString(),
		thumbnail: FALLBACK_THUMBNAIL,
		comics: {
			available: issueCount,
			collectionURI: `${API_BASE_URL}/v1/creators/${creator.id}`,
			items: issueCount
				? [
						{
							resourceURI: `${API_BASE_URL}/v1/creators/${creator.id}`,
							name: `${issueCount} issues credited`,
						},
					]
				: [],
			returned: issueCount ? 1 : 0,
		},
		series: { available: 0, collectionURI: "", items: [], returned: 0 },
		stories: { available: 0, collectionURI: "", items: [], returned: 0 },
		events: { available: 0, collectionURI: "", items: [], returned: 0 },
	};
}

async function fetchCreatorsPage(limit: number, offset: number): Promise<MetronCreatorsResponse> {
	const response = await fetch(`${API_BASE_URL}/v1/creators?limit=${limit}&offset=${offset}`);

	if (!response.ok) {
		throw new Error(`Metron API call failed with status: ${response.status}`);
	}

	return (await response.json()) as MetronCreatorsResponse;
}

async function fetchAllCreators(): Promise<MetronsCreatorItem[]> {
	const allItems: MetronsCreatorItem[] = [];
	let offset = 0;

	while (true) {
		const page = await fetchCreatorsPage(METRON_MAX_LIMIT, offset);
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
			const allItems = await fetchAllCreators();
			const filteredItems = allItems.filter((item) => (item.name || "").toLowerCase().includes(searchTerm));
			const pagedItems = filteredItems.slice(offset, offset + limit);
			const results = pagedItems.map(mapCreatorToLegacy);

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

		const metronData = await fetchCreatorsPage(limit, offset);
		const results = (metronData.items || []).map(mapCreatorToLegacy);

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
