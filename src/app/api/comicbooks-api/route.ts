// pages/api/comics/index.ts
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const BASE_URL = "https://getcomics.org";
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

// Function to fetch HTML from any URL using ScraperAPI with retry logic
async function fetchHtmlWithScraperAPI(url: string, retries = 3, timeoutMs = 15000): Promise<string> {
	if (!SCRAPER_API_KEY) {
		throw new Error("SCRAPER_API_KEY is not configured");
	}

	const scraperApiUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(
		url
	)}&render=false`;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			// Add timeout to the fetch request
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

				// Handle rate limiting with exponential backoff
				if (response.status === 429) {
					if (attempt < retries) {
						const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
						console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${retries}...`);
						await new Promise((resolve) => setTimeout(resolve, waitTime));
						continue;
					}
				}

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`ScraperAPI error (${response.status}): ${errorText}`);
				}

				return await response.text();
			} catch (fetchError) {
				clearTimeout(timeoutId);
				if ((fetchError as any).name === "AbortError") {
					throw new Error(`Request timeout after ${timeoutMs}ms`);
				}
				throw fetchError;
			}
		} catch (error) {
			if (attempt === retries) throw error;
			const waitTime = Math.pow(2, attempt) * 1000;
			console.log(`Request failed. Retrying in ${waitTime}ms...`);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
	}

	throw new Error("Max retries exceeded");
}

// Extract information from scraped info string
function infoScraper(str: string) {
	if (str.length !== 0) {
		const infoString = str.split(",").map((x) => x.split(":"));

		const info: any = {};
		for (let i in infoString) {
			if (infoString[i].length >= 2) {
				info[infoString[i][0].replace(/'/g, "").trim().split(" ").join("")] = infoString[i][1]
					.replace(/'/g, "")
					.trim();
			}
		}
		return info;
	}
	return {};
}

// Scrape individual comic page for detailed information
async function scrapeComicDetails(url: string) {
	try {
		console.log(`Scraping individual page: ${url}`);
		const html = await fetchHtmlWithScraperAPI(url);
		const $ = cheerio.load(html);

		// Extract title - prefer the first h1 or main title
		let title =
			$(".post-info h1, .entry-header h1, .post-title, h1.entry-title").text().trim() ||
			$(".post-title a").text().trim() ||
			$("h1").first().text().trim();

		// Clean up title - sometimes it contains extra elements or multiple titles
		if (title) {
			// Split by common separators and take the first meaningful part
			const titleParts = title.split(/(?:\s{2,}|\n|\t)/);
			if (titleParts.length > 1) {
				// Take the first part if it looks like a proper comic title
				const firstPart = titleParts[0].trim();
				if (firstPart.length > 10 && firstPart.includes("#")) {
					title = firstPart;
				}
			}

			// Remove extra whitespace and limit length
			title = title.replace(/\s+/g, " ").trim().substring(0, 100);
		}

		// Extract description - look for the first substantial paragraph
		let description = "";
		$(".post-content p, .entry-content p, .post-contents p").each((_, el) => {
			const $el = $(el);
			// Remove child elements (links, etc.) and get pure text
			const text = $el.clone().children().remove().end().text().trim();
			if (
				text.length > 50 &&
				!text.toLowerCase().includes("download") &&
				!text.toLowerCase().includes("year:") &&
				!text.toLowerCase().includes("size:") &&
				!description
			) {
				description = text;
			}
		});

		// Extract metadata information - look for patterns like "Year: 2025, Size: 100MB"
		let scrapedInfo = "";
		$(".post-content, .entry-content, .post-contents")
			.find("p, strong")
			.each((_, el) => {
				const text = $(el).text();
				if ((text.includes("Year:") || text.includes("Size:")) && text.includes("|")) {
					scrapedInfo = text;
					return false; // break
				}
			});

		// Also try to extract year and size directly
		const pageText = $(".post-content, .entry-content").text();
		const yearMatch = pageText.match(/Year\s*:\s*(\d{4})/i);
		const sizeMatch = pageText.match(/Size\s*:\s*([\d.]+\s*(?:GB|MB|KB))/i);

		// Parse the scraped info or create from individual matches
		let information: any = {};
		if (scrapedInfo) {
			information = infoScraper(scrapedInfo);
		}

		// Fill in missing info from direct matches
		if (yearMatch && !information.Year) {
			information.Year = yearMatch[1];
		}
		if (sizeMatch && !information.Size) {
			information.Size = sizeMatch[1];
		}

		// Extract download links using reference pattern
		const downloadLinks: { [key: string]: string } = {};

		// Helper to prefer anchors with class 'aio-red' when multiple similar links are present
		function preferAnchorHrefByClass($anchors: any /* Cheerio or array of elements */, preferredClass = "aio-red") {
			// Normalize to an array of elements
			let elems: any[] = [];
			if (Array.isArray($anchors)) elems = $anchors;
			else if (typeof $anchors.get === "function") elems = $anchors.get();

			// Try to find an anchor that has the preferred class first
			for (const a of elems) {
				const cls = $(a).attr("class") || "";
				if (
					cls
						.split(/\s+/)
						.map((c: string) => c.trim())
						.includes(preferredClass)
				) {
					return $(a).attr("href");
				}
			}

			// Otherwise return first anchor with a meaningful href
			for (const a of elems) {
				const href = $(a).attr("href");
				if (href && !href.includes("#comments")) return href;
			}

			return null;
		}

		// First try the reference .aio-pulse selector pattern and prefer aio-red anchors
		$(".aio-pulse").each((_, pulseEl) => {
			const $pulse = $(pulseEl);
			const $anchors = $pulse.find("a");
			if ($anchors.length === 0) return;

			// If there are anchors that look like DOWNLOAD NOW / getcomics dlds links, prefer aio-red among them
			const downloadNowCandidates: any[] = [];
			$anchors.each((_, a) => {
				const $a = $(a);
				const href = $a.attr("href") || "";
				const txt = $a.text().trim().toUpperCase();
				if (txt.includes("DOWNLOAD NOW") || href.toLowerCase().includes("getcomics.org/dlds/")) {
					downloadNowCandidates.push(a as any);
				}
			});

			let chosenHref: string | null = null;
			if (downloadNowCandidates.length > 0) {
				chosenHref = preferAnchorHrefByClass(downloadNowCandidates, "aio-red");
			}

			// If not found, iterate anchors and classify by domain as before
			if (!chosenHref) {
				$anchors.each((_, linkEl) => {
					const $link = $(linkEl);
					const href = $link.attr("href");
					const text = $link.text().trim().toUpperCase();

					if (href && !href.includes("#comments")) {
						const lowerHref = href.toLowerCase();

						// Map according to reference format
						if (text.includes("DOWNLOAD NOW") || lowerHref.includes("getcomics.org/dlds/")) {
							downloadLinks["DOWNLOADNOW"] = href;
						} else if (lowerHref.includes("mega.nz") || lowerHref.includes("mega.co.nz")) {
							downloadLinks["MEGA"] = href;
						} else if (lowerHref.includes("mediafire.com")) {
							downloadLinks["MEDIAFIRE"] = href;
						} else if (text.includes("READ ONLINE")) {
							downloadLinks["READONLINE"] = href;
						} else if (lowerHref.includes("uploadedpremium.link") || lowerHref.includes("ufile.io")) {
							downloadLinks["UFILE"] = href;
						} else if (lowerHref.includes("zippyshare.com")) {
							downloadLinks["ZIPPYSHARE"] = href;
						}
					}
				});
			} else {
				// We found a preferred DOWNLOAD NOW href among candidates
				downloadLinks["DOWNLOADNOW"] = chosenHref;
			}
		});

		// Fallback: scan all links if no .aio-pulse found
		if (Object.keys(downloadLinks).length === 0) {
			$("a").each((_, linkEl) => {
				const $link = $(linkEl);
				const href = $link.attr("href");
				const text = $link.text().trim().toUpperCase();

				if (href && !href.includes("#comments") && !href.includes("/how-to-download")) {
					const lowerHref = href.toLowerCase();

					// Map according to reference format
					if (text.includes("DOWNLOAD NOW") || lowerHref.includes("getcomics.org/dlds/")) {
						downloadLinks["DOWNLOADNOW"] = href;
					} else if (lowerHref.includes("mega.nz") || lowerHref.includes("mega.co.nz")) {
						downloadLinks["MEGA"] = href;
					} else if (lowerHref.includes("mediafire.com")) {
						downloadLinks["MEDIAFIRE"] = href;
					} else if (text.includes("READ ONLINE")) {
						downloadLinks["READONLINE"] = href;
					} else if (lowerHref.includes("uploadedpremium.link") || lowerHref.includes("ufile.io")) {
						downloadLinks["UFILE"] = href;
					} else if (lowerHref.includes("zippyshare.com")) {
						downloadLinks["ZIPPYSHARE"] = href;
					}
				}
			});
		}

		console.log(
			`Scraped ${url}: title="${title}", desc length=${description.length}, links=${
				Object.keys(downloadLinks).length
			}`
		);

		return {
			title,
			description: description || "",
			information,
			downloadLinks,
		};
	} catch (error) {
		console.error(`Error scraping ${url}:`, error);
		return null;
	}
}

async function scrapeWithScraperAPI(searchTerm?: string, page: number = 1) {
	if (!SCRAPER_API_KEY) {
		throw new Error("SCRAPER_API_KEY is not configured");
	}

	try {
		let targetUrl: string;

		if (searchTerm) {
			targetUrl = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(searchTerm)}`;
		} else {
			targetUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
		}

		console.log(`Scraping listing page: ${targetUrl}`);

		const html = await fetchHtmlWithScraperAPI(targetUrl);
		const $ = cheerio.load(html);

		// Collect factories (deferred promise creators) to control concurrency
		const comicPromises: Array<() => Promise<any>> = [];

		// Parse listing page using reference method - look for article elements with proper filtering
		$("article").each((_, element) => {
			const $article = $(element);

			// Debug: try multiple selectors to find the right one
			let $link = $article.find("h2 a").first();
			if (!$link.length) $link = $article.find(".entry-title a").first();
			if (!$link.length) $link = $article.find("h1 a").first();
			if (!$link.length) $link = $article.find('a[href*="getcomics.org"]').first();
			if (!$link.length) $link = $article.find("a").first();

			const href = $link.attr("href");
			const title = $link.text().trim();
			const coverPage = $article.find("img").first().attr("src");

			// Debug logging for the first few articles
			if (comicPromises.length < 5) {
				console.log(`Debug article ${comicPromises.length}:`, {
					titleSelectors: {
						"h2 a": $article.find("h2 a").length,
						".entry-title a": $article.find(".entry-title a").length,
						"h1 a": $article.find("h1 a").length,
						'a[href*="getcomics.org"]': $article.find('a[href*="getcomics.org"]').length,
						a: $article.find("a").length,
					},
					title: title,
					href: href,
					hasCover: !!coverPage,
				});
			}

			// Check if this is a valid individual comic
			// Only skip obvious weekly packs and large collections
			const isWeeklyPack =
				title &&
				(title.toLowerCase().includes("weekly pack") ||
					title.toLowerCase().includes("week pack") ||
					title.toLowerCase().includes("weekly collection"));

			// Allow most individual comics through, only filter out obvious bulk collections
			const isBulkCollection =
				title &&
				(title.toLowerCase().includes("complete collection") ||
					title.toLowerCase().includes("full collection") ||
					(title.toLowerCase().includes("collection") && title.toLowerCase().includes("vol")) ||
					title.toLowerCase().includes("omnibus collection"));

			// Include individual comics and smaller collections, exclude only weekly packs and bulk collections
			if (href && coverPage && title && !isWeeklyPack && !isBulkCollection) {
				console.log(`Found valid comic: ${title} - ${href}`);

				// Create a factory that returns a promise when invoked
				const factory = () =>
					scrapeComicDetails(href)
						.then((details) => {
							if (details && details.title) {
								return {
									title: details.title,
									coverPage: coverPage,
									description: details.description,
									information: details.information,
									downloadLinks: details.downloadLinks,
									url: href,
									id: href.split("/").filter(Boolean).pop() || "",
									publishDate: null,
									categories: [],
								};
							}
							return null;
						})
						.catch((error) => {
							console.error(`Error processing comic ${href}:`, error);
							return null;
						});

				comicPromises.push(factory);
			} else if (isWeeklyPack) {
				console.log(`Skipping weekly pack: ${title}`);
			} else if (isBulkCollection) {
				console.log(`Skipping bulk collection: ${title}`);
			} else {
				console.log(`Skipping invalid item: ${title || "no title"} - href: ${!!href}, cover: ${!!coverPage}`);
			}
		});

		// Process comics and limit to 5 per page to stay within timeout limits
		// Reduced from 8 to 5 to ensure we complete within deployment timeout
		const limitedFactories = comicPromises.slice(0, 5);
		console.log(
			`Found ${comicPromises.length} comics, processing first ${limitedFactories.length} with concurrency limit`
		);

		// Helper to run factories with concurrency limit and delay
		async function runWithConcurrency<T>(factories: Array<() => Promise<T>>, concurrency = 3) {
			const results: T[] = [];
			let index = 0;

			async function worker() {
				while (index < factories.length) {
					const current = index++;
					try {
						// Reduce delay between requests from 300ms to 100ms to speed up processing
						if (current > 0) {
							await new Promise((resolve) => setTimeout(resolve, 100));
						}
						// Invoke factory
						const res = await factories[current]();
						results[current] = res as any;
					} catch (err) {
						console.error(`Factory error at index ${current}:`, err);
						results[current] = null as any;
					}
				}
			}

			// Start workers
			const workers = [];
			for (let i = 0; i < Math.min(concurrency, factories.length); i++) {
				workers.push(worker());
			}

			await Promise.all(workers);
			return results;
		}

		// Run factories with increased concurrency (3 instead of 5) for faster processing
		// Reduced to balance speed vs rate limiting
		const comics = await runWithConcurrency(limitedFactories, 3);

		// Filter out null results
		const validComics = comics.filter((comic) => comic !== null && comic !== undefined);

		console.log(`Successfully processed ${validComics.length} comics`);

		// Get pagination info
		const totalPages = $(".pagination .page-numbers").not(".next, .prev").last().text();
		const hasMore = $(".pagination .next").length > 0;

		return {
			results: validComics,
			pagination: {
				current_page: page,
				total_pages: totalPages ? parseInt(totalPages, 10) : page,
				has_more: hasMore,
				total_results: validComics.length,
			},
			success: true,
		};
	} catch (error) {
		console.error("Scraping error:", error);
		throw error;
	}
}

// Add timeout wrapper for the entire scraping operation
async function scrapeWithTimeout(searchTerm: string | undefined, page: number, timeoutMs: number = 50000) {
	return Promise.race([
		scrapeWithScraperAPI(searchTerm, page),
		new Promise((_, reject) => setTimeout(() => reject(new Error("Scraping operation timed out")), timeoutMs)),
	]);
}

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const searchTerm = urlParams.get("query");
	const page = parseInt(urlParams.get("page") || "1", 10);

	console.log(`API Request - Search: ${searchTerm}, Page: ${page}`);
	console.log(`Environment check - SCRAPER_API_KEY exists: ${!!process.env.SCRAPER_API_KEY}`);

	// Validate page number
	if (page < 1) {
		return NextResponse.json({ error: "Invalid page number. Must be >= 1" }, { status: 400 });
	}

	try {
		// Use timeout wrapper - adjust timeout based on your deployment platform
		// Vercel Hobby: 10s, Vercel Pro: 60s, Railway/Render: 30s typical
		const data = (await scrapeWithTimeout(searchTerm || undefined, page, 50000)) as any;

		// Return just the comics array to match the expected format
		return NextResponse.json(data.results, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
			},
		});
	} catch (error) {
		console.error("API Error Details:", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			type: error?.constructor?.name,
			searchTerm,
			page,
		});

		const errorMessage = error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json(
			{
				error: "Failed to fetch comics",
				message: errorMessage,
				success: false,
				debug: {
					searchTerm,
					page,
					timestamp: new Date().toISOString(),
					apiKeyConfigured: !!process.env.SCRAPER_API_KEY,
				},
			},
			{ status: 500 }
		);
	}
}

// Configure the route to run in edge runtime for better performance (optional)
export const runtime = "nodejs"; // or 'edge' if compatible
export const maxDuration = 60; // Set max duration (seconds) - requires Vercel Pro or compatible platform
