import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// You'll need to sign up for a free Comic Vine API key
// https://comicvine.gamespot.com/api/
const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY || "your-api-key-here";

// List of comic genres to randomize suggestions
const genres = [
	"superhero",
	"sci-fi",
	"fantasy",
	"horror",
	"crime",
	"slice of life",
	"manga",
	"indie",
	"graphic novel",
	"action",
	"adventure",
	"western",
	"war",
	"biographical",
	"historical",
	"comedy",
	"drama",
	"mystery",
	"thriller",
	"romance",
];

// Reliable image sources as fallbacks
const fallbackImages = {
	superhero: "https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?q=80&w=300&auto=format&fit=crop",
	"sci-fi": "https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?q=80&w=300&auto=format&fit=crop",
	fantasy: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop",
	horror: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=300&auto=format&fit=crop",
	crime: "https://images.unsplash.com/photo-1453873623425-04e3213d56e5?q=80&w=300&auto=format&fit=crop",
	"slice of life": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=300&auto=format&fit=crop",
	manga: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop",
	indie: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?q=80&w=300&auto=format&fit=crop",
	"graphic novel": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300&auto=format&fit=crop",
	action: "https://images.unsplash.com/photo-1535970793482-07de93762dc4?q=80&w=300&auto=format&fit=crop",
	adventure: "https://images.unsplash.com/photo-1569498237219-011a1c1869ee?q=80&w=300&auto=format&fit=crop",
	default: "https://images.unsplash.com/photo-1553545204-4f7d339aa06a?q=80&w=300&auto=format&fit=crop",
};

export async function GET(request: NextRequest) {
	try {
		// Extract previously shown comic titles from a URL parameter to avoid repetition
		const url = new URL(request.url);
		const previousTitles = url.searchParams.get("previous")
			? decodeURIComponent(url.searchParams.get("previous") || "").split("|")
			: [];

		// Get user preferences from query parameters
		const userName = url.searchParams.get("name") || "";
		const userGenre = url.searchParams.get("genre") || "";
		const userStyle = url.searchParams.get("style") || "";
		const userExperience = url.searchParams.get("experience") || "";
		const userPurpose = url.searchParams.get("purpose") || "";

		// Use user's preferred genre if provided, otherwise pick random
		const selectedGenre = userGenre ? userGenre.toLowerCase() : genres[Math.floor(Math.random() * genres.length)];
		const randomSeed = Math.floor(Math.random() * 10000);

		// Build a personalized prompt based on user preferences
		let prompt = `
      Suggest a unique ${selectedGenre} comic book that's worth reading.
      ${previousTitles.length > 0 ? `AVOID these titles that were already suggested: ${previousTitles.join(", ")}` : ""}
      Use random seed: ${randomSeed} to ensure variety.
    `;

		// Add personalization based on user inputs
		if (userName) {
			prompt += `\nThis recommendation is for ${userName}.`;
		}

		if (userStyle) {
			prompt += `\nThey prefer comics in the ${userStyle} style.`;
		}

		if (userExperience) {
			prompt += `\nTheir experience level with comics is: ${userExperience}.`;
		}

		if (userPurpose) {
			prompt += `\nThey're looking for comics for: ${userPurpose}.`;
		}

		prompt += `
      IMPORTANT REQUIREMENTS:
      1. Select a well-known, critically acclaimed comic that represents the best of the ${selectedGenre} genre
      2. The title should be a specific comic series that can be found online
      3. Include detailed information about the creative team
      4. Do not suggest popular mainstream comics like Watchmen, Dark Knight Returns, Saga, etc. unless the genre specifically calls for it
      ${userExperience && userExperience.includes("Beginner") ? "5. Make sure this is accessible to beginners" : ""}
      ${
			userExperience && userExperience.includes("Expert")
				? "5. Feel free to suggest more obscure or complex works"
				: ""
		}

      Return ONLY the following JSON format, no additional text:
      {
        "title": "Comic title",
        "description": "A brief but compelling description of what makes this comic special",
        "reason": "Why this comic is worth reading and what makes it stand out${
			userName ? ` specifically for ${userName}` : ""
		}",
        "year": "Year first published (e.g. 1986)",
        "type": "Format (e.g. graphic novel, limited series, ongoing series)",
        "publisher": "Publishing company name",
        "artist": "Main artist's full name",
        "writer": "Main writer's full name"
      }
    `;

		const result = await model.generateContent(prompt);
		const response = result.response;
		const text = response.text();

		// Clean the response and parse it as JSON
		const cleanedText = text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
		const suggestion = JSON.parse(cleanedText);

		try {
			// Search for the comic using Comic Vine API
			const searchQuery = encodeURIComponent(suggestion.title);
			const apiUrl = `https://comicvine.gamespot.com/api/search/?api_key=${COMIC_VINE_API_KEY}&format=json&query=${searchQuery}&resources=volume&field_list=name,image,site_detail_url&limit=1`;

			const apiResponse = await fetch(apiUrl);
			if (!apiResponse.ok) throw new Error("API request failed");

			const apiData = await apiResponse.json();

			if (apiData.results && apiData.results.length > 0) {
				const comic = apiData.results[0];

				// Comic Vine returns image data in a specific format
				if (comic.image && comic.image.super_url) {
					suggestion.imageUrl = comic.image.super_url;
				}

				// Use the Comic Vine detail URL if available
				if (comic.site_detail_url) {
					suggestion.link = comic.site_detail_url;
				}
			} else {
				throw new Error("No results found");
			}
		} catch (apiError) {
			console.error("Error fetching from Comic Vine API:", apiError);
			// Use genre-specific fallback image if API call fails
			suggestion.imageUrl = fallbackImages[selectedGenre] || fallbackImages["default"];
		}

		// If we still don't have an image URL, use the fallback
		if (!suggestion.imageUrl) {
			suggestion.imageUrl = fallbackImages[selectedGenre] || fallbackImages["default"];
		}

		// Add a generic link if none is available
		if (!suggestion.link) {
			suggestion.link = `https://www.google.com/search?q=${encodeURIComponent(
				suggestion.title + " comic " + suggestion.publisher
			)}`;
		}

		return NextResponse.json({ suggestion });
	} catch (error) {
		console.error("Error generating comic suggestion:", error);
		return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 500 });
	}
}
