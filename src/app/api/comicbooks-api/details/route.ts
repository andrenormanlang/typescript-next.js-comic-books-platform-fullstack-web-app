// Endpoint for fetching detailed information for a single comic
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

async function fetchHtmlWithScraperAPI(url: string, timeoutMs = 15000): Promise<string> {
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

async function scrapeComicDetails(url: string) {
	try {
		console.log(`Scraping details for: ${url}`);
		const html = await fetchHtmlWithScraperAPI(url);
		const $ = cheerio.load(html);

		let title =
			$(".post-info h1, .entry-header h1, .post-title, h1.entry-title").text().trim() ||
			$(".post-title a").text().trim() ||
			$("h1").first().text().trim();

		if (title) {
			const titleParts = title.split(/(?:\s{2,}|\n|\t)/);
			if (titleParts.length > 1) {
				const firstPart = titleParts[0].trim();
				if (firstPart.length > 10 && firstPart.includes("#")) {
					title = firstPart;
				}
			}
			title = title.replace(/\s+/g, " ").trim().substring(0, 100);
		}

		let description = "";
		$(".post-content p, .entry-content p, .post-contents p").each((_, el) => {
			const $el = $(el);
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

		let scrapedInfo = "";
		$(".post-content, .entry-content, .post-contents")
			.find("p, strong")
			.each((_, el) => {
				const text = $(el).text();
				if ((text.includes("Year:") || text.includes("Size:")) && text.includes("|")) {
					scrapedInfo = text;
					return false;
				}
			});

		const pageText = $(".post-content, .entry-content").text();
		const yearMatch = pageText.match(/Year\s*:\s*(\d{4})/i);
		const sizeMatch = pageText.match(/Size\s*:\s*([\d.]+\s*(?:GB|MB|KB))/i);

		let information: any = {};
		if (scrapedInfo) {
			information = infoScraper(scrapedInfo);
		}

		if (yearMatch && !information.Year) {
			information.Year = yearMatch[1];
		}
		if (sizeMatch && !information.Size) {
			information.Size = sizeMatch[1];
		}

		const downloadLinks: { [key: string]: string } = {};

		function preferAnchorHrefByClass($anchors: any, preferredClass = "aio-red") {
			let elems: any[] = [];
			if (Array.isArray($anchors)) elems = $anchors;
			else if (typeof $anchors.get === "function") elems = $anchors.get();

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

			for (const a of elems) {
				const href = $(a).attr("href");
				if (href && !href.includes("#comments")) return href;
			}

			return null;
		}

		$(".aio-pulse").each((_, pulseEl) => {
			const $pulse = $(pulseEl);
			const $anchors = $pulse.find("a");
			if ($anchors.length === 0) return;

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

			if (!chosenHref) {
				$anchors.each((_, linkEl) => {
					const $link = $(linkEl);
					const href = $link.attr("href");
					const text = $link.text().trim().toUpperCase();

					if (href && !href.includes("#comments")) {
						const lowerHref = href.toLowerCase();

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
				downloadLinks["DOWNLOADNOW"] = chosenHref;
			}
		});

		if (Object.keys(downloadLinks).length === 0) {
			$("a").each((_, linkEl) => {
				const $link = $(linkEl);
				const href = $link.attr("href");
				const text = $link.text().trim().toUpperCase();

				if (href && !href.includes("#comments") && !href.includes("/how-to-download")) {
					const lowerHref = href.toLowerCase();

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

		return {
			title,
			description: description || "",
			information,
			downloadLinks,
		};
	} catch (error) {
		console.error(`Error scraping ${url}:`, error);
		throw error;
	}
}

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const comicUrl = urlParams.get("url");

	if (!comicUrl) {
		return NextResponse.json({ error: "Comic URL is required" }, { status: 400 });
	}

	// Validate URL is from getcomics.org
	if (!comicUrl.includes("getcomics.org")) {
		return NextResponse.json({ error: "Invalid comic URL" }, { status: 400 });
	}

	try {
		const details = await scrapeComicDetails(comicUrl);

		return NextResponse.json(details, {
			headers: {
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
			},
		});
	} catch (error) {
		console.error("Comic details error:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch comic details",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export const runtime = "nodejs";
export const maxDuration = 30;
