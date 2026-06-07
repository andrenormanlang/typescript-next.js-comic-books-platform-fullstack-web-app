import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

type MetronSeriesDetail = {
	seriesId: number;
	seriesName: string;
	issueCount?: number;
	firstIssueDate?: string;
	lastIssueDate?: string;
};

// Map Metron series detail to legacy Marvel format
function mapSeriesDetailToLegacy(series: MetronSeriesDetail) {
	const issueCount = series.issueCount || 0;
	const comicsItems = issueCount
		? [
				{
					resourceURI: `${API_BASE_URL}/v1/series/${series.seriesId}`,
					name: `${issueCount} issues in this series`,
				},
			]
		: [];

	return {
		id: series.seriesId,
		title: series.seriesName,
		description: `${issueCount} issues. First: ${series.firstIssueDate || "N/A"}, Last: ${series.lastIssueDate || "N/A"}`,
		resourceURI: `${API_BASE_URL}/v1/series/${series.seriesId}`,
		urls: [
			{
				type: "detail",
				url: `https://www.marvel.com/search?q=${encodeURIComponent(series.seriesName)}`,
			},
		],
		modified: new Date().toISOString(),
		start: series.firstIssueDate || "",
		end: series.lastIssueDate || "",
		thumbnail: FALLBACK_THUMBNAIL,
		creators: { available: 0, collectionURI: "", items: [], returned: 0 },
		characters: { available: 0, collectionURI: "", items: [], returned: 0 },
		stories: { available: 0, collectionURI: "", items: [], returned: 0 },
		comics: {
			available: issueCount,
			collectionURI: `${API_BASE_URL}/v1/series/${series.seriesId}`,
			items: comicsItems,
			returned: comicsItems.length,
		},
		series: [],
		next: null,
		previous: null,
	};
}

export async function GET(request: NextRequest) {
	const serieId = request.nextUrl.pathname.split("/").pop();

	try {
		const apiUrl = `${API_BASE_URL}/v1/series/${serieId}`;
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error(`Metron API call failed with status: ${response.status}`);
		}

		const metronData = (await response.json()) as MetronSeriesDetail;
		const result = mapSeriesDetailToLegacy(metronData);

		const data = {
			data: {
				offset: 0,
				limit: 1,
				total: 1,
				count: 1,
				results: [result],
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
					offset: 0,
					limit: 1,
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
