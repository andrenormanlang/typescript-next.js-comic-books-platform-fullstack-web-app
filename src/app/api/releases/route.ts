import { NextResponse } from "next/server";

interface MetronListResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url: string, init: RequestInit, maxRetries = 3) {
	let attempt = 0;
	while (attempt <= maxRetries) {
		try {
			const response = await fetch(url, init);
			if (response.status === 429 && attempt < maxRetries) {
				const waitTimeMs = Math.min(1000 * Math.pow(2, attempt), 8000);
				await delay(waitTimeMs);
				attempt++;
				continue;
			}
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}
			return await response.json();
		} catch (error) {
			if (attempt >= maxRetries) throw error;
			await delay(300 * Math.pow(2, attempt));
			attempt++;
		}
	}
	throw new Error("Max retries reached");
}

function toIsoDateOnly(date: Date) {
	return date.toISOString().split("T")[0];
}

async function fetchMetronList<T>(params: URLSearchParams, authHeaderValue: string): Promise<MetronListResponse<T>> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 12000);

	try {
		const url = `https://metron.cloud/api/issue/?${params.toString()}`;
		const data = (await fetchJsonWithRetry(
			url,
			{
				headers: {
					Authorization: `Basic ${authHeaderValue}`,
					Accept: "application/json",
				},
				signal: controller.signal,
				cache: "force-cache",
				next: { revalidate: 300 },
			},
			3,
		)) as MetronListResponse<T>;

		return data;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchMetronCount(params: URLSearchParams, authHeaderValue: string) {
	const countParams = new URLSearchParams(params);
	countParams.set("page", "1");
	countParams.set("page_size", "1");
	const data = await fetchMetronList<unknown>(countParams, authHeaderValue);
	return data.count;
}

// Fetches ALL pages from the Metron API so we can sort globally across all results.
// Uses page_size=100 to minimize the number of requests (cached for 5 minutes each).
const METRON_FETCH_PAGE_SIZE = 100;

async function fetchAllMetronResults<T>(
	baseParams: URLSearchParams,
	authHeaderValue: string,
): Promise<{ results: T[]; count: number }> {
	const firstPageParams = new URLSearchParams(baseParams);
	firstPageParams.set("page", "1");
	firstPageParams.set("page_size", METRON_FETCH_PAGE_SIZE.toString());

	const firstPage = await fetchMetronList<T>(firstPageParams, authHeaderValue);
	const total = firstPage.count;
	const totalPages = Math.ceil(total / METRON_FETCH_PAGE_SIZE);

	if (totalPages <= 1) {
		return { results: firstPage.results, count: total };
	}

	// Fetch remaining pages concurrently — each is individually cached.
	const remainingPagePromises = Array.from({ length: totalPages - 1 }, (_, i) => {
		const params = new URLSearchParams(baseParams);
		params.set("page", (i + 2).toString());
		params.set("page_size", METRON_FETCH_PAGE_SIZE.toString());
		return fetchMetronList<T>(params, authHeaderValue);
	});

	const remainingPages = await Promise.all(remainingPagePromises);
	const allResults = [firstPage.results, ...remainingPages.map((p) => p.results)].flat();

	return { results: allResults, count: total };
}

export async function GET(request: Request) {
	try {
		const authHeaderValue = process.env.METRON_API_AUTH_HEADER;

		if (!authHeaderValue) {
			return new NextResponse("METRON_API_AUTH_HEADER environment variable is not set", {
				status: 401,
			});
		}

		const { searchParams } = new URL(request.url);
		const pageParam = searchParams.get("page");
		const pageSizeParam = searchParams.get("pageSize");
		const view = searchParams.get("view") || "recent";

		const page = pageParam && !isNaN(Number(pageParam)) ? Math.max(1, parseInt(pageParam)) : 1;
		const requestedPageSize =
			pageSizeParam && !isNaN(Number(pageSizeParam)) ? Math.max(1, parseInt(pageSizeParam)) : 20;
		const pageSize = Math.min(100, requestedPageSize);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setDate(today.getDate() - 30);
		const thirtyDaysAhead = new Date(today);
		thirtyDaysAhead.setDate(today.getDate() + 30);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);

		const forwardedParams = new URLSearchParams();
		for (const [key, value] of searchParams.entries()) {
			if (key !== "page" && key !== "pageSize" && key !== "view" && value) {
				forwardedParams.append(key, value);
			}
		}

		const recentParams = new URLSearchParams(forwardedParams);
		recentParams.set("store_date_range_after", toIsoDateOnly(thirtyDaysAgo));
		recentParams.set("store_date_range_before", toIsoDateOnly(today));

		const upcomingParams = new URLSearchParams(forwardedParams);
		upcomingParams.set("store_date_range_after", toIsoDateOnly(tomorrow));
		upcomingParams.set("store_date_range_before", toIsoDateOnly(thirtyDaysAhead));

		const activeParams = view === "recent" ? recentParams : upcomingParams;
		const otherParams = view === "recent" ? upcomingParams : recentParams;

		// Fetch ALL results for the active view so we can sort globally, then paginate ourselves.
		const { results: allResults, count: viewCount } = await fetchAllMetronResults<any>(
			activeParams,
			authHeaderValue,
		);

		// Sort ALL results globally by date — newest first for recent, soonest first for upcoming.
		const sortedAllResults = [...allResults].sort((a, b) => {
			const aTime = a?.store_date ? new Date(a.store_date).getTime() : 0;
			const bTime = b?.store_date ? new Date(b.store_date).getTime() : 0;
			return view === "recent" ? bTime - aTime : aTime - bTime;
		});

		// Apply our own pagination to the globally sorted list.
		const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
		const clampedPage = Math.min(page, totalPages);
		const startIndex = (clampedPage - 1) * pageSize;
		const sortedResults = sortedAllResults.slice(startIndex, startIndex + pageSize);

		const otherCount = await fetchMetronCount(otherParams, authHeaderValue);
		const recentCount = view === "recent" ? viewCount : otherCount;
		const upcomingCount = view === "recent" ? otherCount : viewCount;
		const totalCount = recentCount + upcomingCount;

		return NextResponse.json(
			{
				results: sortedResults,
				count: viewCount,
				totalCount,
				recentCount,
				upcomingCount,
				totalPages,
				currentPage: clampedPage,
				pageSize,
				next: clampedPage < totalPages ? `?page=${clampedPage + 1}` : null,
				previous: clampedPage > 1 ? `?page=${clampedPage - 1}` : null,
				view,
			},
			{
				headers: {
					"Cache-Control": "s-maxage=300, stale-while-revalidate=600",
				},
			},
		);
	} catch (error) {
		console.error("Error fetching from Metron API:", error);
		return NextResponse.json({ error: "Failed to fetch data from Metron API" }, { status: 500 });
	}
}
