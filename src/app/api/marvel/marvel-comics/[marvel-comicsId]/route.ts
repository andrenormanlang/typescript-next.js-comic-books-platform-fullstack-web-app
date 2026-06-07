import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

type MarvelMetadataCreator = {
	id: number;
	name: string;
	role: string;
};

type MarvelMetadataIssueDetail = {
	id: number;
	digitalId?: number | null;
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
	creators?: MarvelMetadataCreator[];
	cover?: {
		path?: string | null;
		extension?: string | null;
	} | null;
};

function mapIssueDetailToLegacyResponse(issue: MarvelMetadataIssueDetail) {
	const coverPath = issue.cover?.path?.replace("http://", "https://") || FALLBACK_THUMBNAIL.path;
	const coverExtension = issue.cover?.extension || FALLBACK_THUMBNAIL.extension;
	const creators = Array.isArray(issue.creators) ? issue.creators : [];

	return {
		data: {
			results: [
				{
					id: issue.id,
					digitalId: issue.digitalId ?? null,
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
					resourceURI: `/v1/issues/${issue.id}`,
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
						available: creators.length,
						collectionURI: "",
						items: creators.map((creator) => ({
							resourceURI: `/v1/creators/${creator.id}`,
							name: creator.name,
							role: creator.role,
						})),
						returned: creators.length,
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
					comics: {
						available: issue.seriesId ? 1 : 0,
						collectionURI: issue.seriesId ? `/v1/series/${issue.seriesId}/issues` : "",
						items: issue.seriesId
							? [
									{
										resourceURI: `/v1/series/${issue.seriesId}`,
										name: issue.seriesName || "Unknown Series",
									},
								]
							: [],
						returned: issue.seriesId ? 1 : 0,
					},
				},
			],
		},
	};
}

export async function GET(request: NextRequest) {
	// Extract the comic id from the URL.
	const comicId = request.nextUrl.pathname.split("/").pop();

	if (!comicId || Number.isNaN(Number(comicId))) {
		return new NextResponse(JSON.stringify({ error: "Invalid comic id" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}

	const apiUrl = `${API_BASE_URL}/v1/issues/${comicId}`;

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error(`Marvel API call failed with status: ${response.status}`);
		}

		const issue = (await response.json()) as MarvelMetadataIssueDetail;
		const normalized = mapIssueDetailToLegacyResponse(issue);

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
