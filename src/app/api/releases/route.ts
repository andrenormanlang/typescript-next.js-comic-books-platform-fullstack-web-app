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
			// AbortError is commonly transient with slow upstreams; allow retry.
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
	const data = await fetchMetronList<unknown>(countParams, authHeaderValue);
	return data.count;
}

function isMetronInvalidPageError(error: unknown) {
	if (!(error instanceof Error)) return false;
	return error.message.includes("HTTP 404") && error.message.includes("Invalid page");
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

		// Ensure page and pageSize are valid numbers
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
		recentParams.set("page_size", pageSize.toString());

		const upcomingParams = new URLSearchParams(forwardedParams);
		upcomingParams.set("store_date_range_after", toIsoDateOnly(tomorrow));
		upcomingParams.set("store_date_range_before", toIsoDateOnly(thirtyDaysAhead));
		upcomingParams.set("page_size", pageSize.toString());

		// 1) Fetch the active view list (includes count), 2) fetch the other view count.
		const activeParams = view === "recent" ? recentParams : upcomingParams;
		const otherParams = view === "recent" ? upcomingParams : recentParams;

		let listData: MetronListResponse<any>;
		try {
			const listParams = new URLSearchParams(activeParams);
			listParams.set("page", page.toString());
			listData = await fetchMetronList<any>(listParams, authHeaderValue);
		} catch (error) {
			// If a user has a stale URL with an out-of-range page, avoid a hard 500.
			if (isMetronInvalidPageError(error)) {
				const viewCount = await fetchMetronCount(activeParams, authHeaderValue);
				const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
				const currentPage = Math.min(page, totalPages);

				const otherCount = await fetchMetronCount(otherParams, authHeaderValue);
				const recentCount = view === "recent" ? viewCount : otherCount;
				const upcomingCount = view === "recent" ? otherCount : viewCount;
				const totalCount = recentCount + upcomingCount;

				return NextResponse.json(
					{
						results: [],
						count: viewCount,
						totalCount,
						recentCount,
						upcomingCount,
						totalPages,
						currentPage,
						pageSize,
						next: currentPage < totalPages ? `?page=${currentPage + 1}` : null,
						previous: currentPage > 1 ? `?page=${currentPage - 1}` : null,
						view,
					},
					{
						headers: {
							"Cache-Control": "s-maxage=300, stale-while-revalidate=600",
						},
					},
				);
			}
			throw error;
		}

		const sortedResults = [...(listData.results || [])].sort((a, b) => {
			const aTime = a?.store_date ? new Date(a.store_date).getTime() : 0;
			const bTime = b?.store_date ? new Date(b.store_date).getTime() : 0;
			return aTime - bTime;
		});

		const viewCount = listData.count;
		const otherCount = await fetchMetronCount(otherParams, authHeaderValue);
		const recentCount = view === "recent" ? viewCount : otherCount;
		const upcomingCount = view === "recent" ? otherCount : viewCount;
		const totalCount = recentCount + upcomingCount;
		const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));

		return NextResponse.json(
			{
				results: sortedResults,
				count: viewCount,
				totalCount,
				recentCount,
				upcomingCount,
				totalPages,
				currentPage: page,
				pageSize,
				next: page < totalPages ? `?page=${page + 1}` : null,
				previous: page > 1 ? `?page=${page - 1}` : null,
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
