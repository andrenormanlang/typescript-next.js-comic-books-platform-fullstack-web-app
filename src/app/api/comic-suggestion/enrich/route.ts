import { NextRequest, NextResponse } from "next/server";

const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY;

export async function GET(request: NextRequest) {
	try {
		if (!COMIC_VINE_API_KEY) {
			return NextResponse.json({ error: "COMIC_VINE_API_KEY is not configured" }, { status: 500 });
		}

		const url = new URL(request.url);
		const title = (url.searchParams.get("title") || "").trim();

		if (!title) {
			return NextResponse.json({ error: "Missing required query parameter: title" }, { status: 400 });
		}

		const searchQuery = encodeURIComponent(title);
		const apiUrl = `https://comicvine.gamespot.com/api/search/?api_key=${COMIC_VINE_API_KEY}&format=json&query=${searchQuery}&resources=volume&field_list=name,image,site_detail_url&limit=1`;

		const apiResponse = await fetch(apiUrl, {
			// ComicVine can be slow; caching helps repeat queries without being "fallback".
			next: { revalidate: 60 * 60 * 24 },
		});

		if (!apiResponse.ok) {
			return NextResponse.json({ error: "ComicVine request failed" }, { status: 502 });
		}

		const apiData = (await apiResponse.json()) as {
			results?: Array<{ image?: { super_url?: string }; site_detail_url?: string }>;
		};

		const first = apiData.results?.[0];
		const imageUrl = first?.image?.super_url || null;
		const link = first?.site_detail_url || null;

		return NextResponse.json(
			{ imageUrl, link },
			{
				headers: {
					"Cache-Control": "public, max-age=86400, s-maxage=86400",
				},
			},
		);
	} catch (error) {
		console.error("Error enriching comic suggestion:", error);
		return NextResponse.json({ error: "Failed to enrich suggestion" }, { status: 500 });
	}
}
