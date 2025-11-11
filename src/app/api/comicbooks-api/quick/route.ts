// Quick endpoint that returns basic comic info without detailed scraping
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const BASE_URL = "https://getcomics.org";
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

async function fetchHtmlWithScraperAPI(url: string, timeoutMs = 10000): Promise<string> {
	if (!SCRAPER_API_KEY) {
		throw new Error("SCRAPER_API_KEY is not configured");
	}

	const scraperApiUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(
		url
	)}&render=false`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(scraperApiUrl, {
			method: "GET",
			headers: {
				Accept: "text/html",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`ScraperAPI error (${response.status})`);
		}

		return await response.text();
	} catch (error) {
		clearTimeout(timeoutId);
		if ((error as any).name === "AbortError") {
			throw new Error(`Request timeout after ${timeoutMs}ms`);
		}
		throw error;
	}
}

async function scrapeBasicListingOnly(searchTerm?: string, page: number = 1) {
	try {
		let targetUrl: string;

		if (searchTerm) {
			targetUrl = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(searchTerm)}`;
		} else {
			targetUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
		}

		console.log(`Quick scraping listing page: ${targetUrl}`);

		const html = await fetchHtmlWithScraperAPI(targetUrl);
		const $ = cheerio.load(html);

		const comics: any[] = [];

		// Parse listing page - extract only basic info from the listing
		$("article").each((_, element) => {
			const $article = $(element);

			let $link = $article.find("h2 a").first();
			if (!$link.length) $link = $article.find(".entry-title a").first();
			if (!$link.length) $link = $article.find("h1 a").first();
			if (!$link.length) $link = $article.find("a").first();

			const href = $link.attr("href");
			const title = $link.text().trim();
			const coverPage = $article.find("img").first().attr("src");

			// Basic filtering
			const isWeeklyPack = title && title.toLowerCase().includes("weekly pack");
			const isBulkCollection =
				title &&
				(title.toLowerCase().includes("complete collection") ||
					title.toLowerCase().includes("full collection"));

			if (href && coverPage && title && !isWeeklyPack && !isBulkCollection) {
				// Return basic info only - no detailed scraping
				comics.push({
					title: title,
					coverPage: coverPage,
					description: "", // Empty - would require individual page scraping
					information: {}, // Empty - would require individual page scraping
					downloadLinks: {}, // Empty - would require individual page scraping
					url: href,
					id: href.split("/").filter(Boolean).pop() || "",
					publishDate: null,
					categories: [],
					needsDetails: true, // Flag indicating this needs detailed scraping
				});

				// Limit to 10 for quick response
				if (comics.length >= 10) {
					return false; // Break the each loop
				}
			}
		});

		console.log(`Quick scraped ${comics.length} basic comic entries`);

		// Get pagination info
		const totalPages = $(".pagination .page-numbers").not(".next, .prev").last().text();
		const hasMore = $(".pagination .next").length > 0;

		return {
			results: comics,
			pagination: {
				current_page: page,
				total_pages: totalPages ? parseInt(totalPages, 10) : page,
				has_more: hasMore,
				total_results: comics.length,
			},
			success: true,
		};
	} catch (error) {
		console.error("Quick scraping error:", error);
		throw error;
	}
}

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const searchTerm = urlParams.get("query");
	const page = parseInt(urlParams.get("page") || "1", 10);

	console.log(`Quick API Request - Search: ${searchTerm}, Page: ${page}`);

	if (page < 1) {
		return NextResponse.json({ error: "Invalid page number. Must be >= 1" }, { status: 400 });
	}

	try {
		const data = await scrapeBasicListingOnly(searchTerm || undefined, page);

		return NextResponse.json(data.results, {
			headers: {
				"Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
			},
		});
	} catch (error) {
		console.error("Quick API Error:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch comics",
				message: error instanceof Error ? error.message : "Unknown error",
				success: false,
			},
			{ status: 500 }
		);
	}
}

export const runtime = "nodejs";
export const maxDuration = 30;
