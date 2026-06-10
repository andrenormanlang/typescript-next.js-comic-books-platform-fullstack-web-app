import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const authHeaderValue = process.env.METRON_API_AUTH_HEADER;

	if (!authHeaderValue) {
		return new NextResponse("METRON_API_AUTH_HEADER environment variable is not set", {
			status: 401,
		});
	}

	const { id } = await params;
	const url = `https://metron.cloud/api/issue/${id}/`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const response = await fetch(url, {
			headers: {
				Authorization: `Basic ${authHeaderValue}`,
				Accept: "application/json",
			},
			signal: controller.signal,
			cache: "force-cache",
			next: { revalidate: 3600 },
		});
		clearTimeout(timeout);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API call failed with status: ${response.status}`, errorText);
			throw new Error(`API call failed with status: ${response.status}. Details: ${errorText}`);
		}

		const data = await response.json();
		return NextResponse.json(data, {
			headers: {
				"Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
			},
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
		console.error("Failed to fetch comic issue:", errorMessage);

		return new NextResponse(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
}
