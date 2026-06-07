import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://marvel.emreparker.com";
const FALLBACK_THUMBNAIL = {
	path: "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available",
	extension: "jpg",
};

type MetronCreatorRole = {
	role?: string;
	issueCount?: number;
};

type MetronCreatorDetail = {
	id: number;
	name: string;
	totalIssues?: number;
	roles?: MetronCreatorRole[];
};

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

// Map Metron creator detail to legacy Marvel format
function mapCreatorDetailToLegacy(creatorDetail: MetronCreatorDetail) {
	const name = splitCreatorName(creatorDetail.name);
	const roleItems = (creatorDetail.roles || [])
		.filter((role) => Boolean(role.role))
		.map((role) => {
			const roleName = role.role || "Contributor";
			const roleIssueCount = role.issueCount || 0;

			return {
				resourceURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}#${encodeURIComponent(roleName)}`,
				name: `${roleName} (${roleIssueCount} issues)`,
				role: roleName,
			};
		});

	const roleSummary = roleItems.map((item) => item.name).join(", ");
	const totalIssues = creatorDetail.totalIssues || 0;

	return {
		id: creatorDetail.id,
		firstName: name.firstName,
		lastName: name.lastName,
		fullName: name.fullName,
		suffix: "",
		middleName: "",
		description: roleSummary ? `${totalIssues} total issues. Roles: ${roleSummary}` : `${totalIssues} total issues`,
		resourceURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}`,
		urls: [
			{
				type: "detail",
				url: `https://www.marvel.com/search?q=${encodeURIComponent(creatorDetail.name)}`,
			},
		],
		modified: new Date().toISOString(),
		thumbnail: FALLBACK_THUMBNAIL,
		comics: {
			available: totalIssues,
			collectionURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}`,
			items: roleItems,
			returned: roleItems.length,
		},
		series: {
			available: 1,
			collectionURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}`,
			items: [
				{
					resourceURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}`,
					name: `${totalIssues} total credited issues`,
				},
			],
			returned: 1,
		},
		stories: {
			available: roleItems.length,
			collectionURI: `${API_BASE_URL}/v1/creators/${creatorDetail.id}`,
			items: roleItems.map((item) => ({
				resourceURI: item.resourceURI,
				name: item.name,
				type: "role",
			})),
			returned: roleItems.length,
		},
		events: { available: 0, collectionURI: "", items: [], returned: 0 },
	};
}

export async function GET(request: NextRequest) {
	const creatorId = request.nextUrl.pathname.split("/").pop();

	try {
		const apiUrl = `${API_BASE_URL}/v1/creators/${creatorId}`;
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error(`Metron API call failed with status: ${response.status}`);
		}

		const metronData = (await response.json()) as MetronCreatorDetail;
		const result = mapCreatorDetailToLegacy(metronData);

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
