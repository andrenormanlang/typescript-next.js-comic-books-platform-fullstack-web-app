import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { comicGenres, comicStyles, experienceLevels, purposes } from "@/lib/comicSuggestionOptions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SuggestionResponseJsonSchema = {
	$id: "https://retro-pop.app/schemas/comic-suggestion.json",
	type: "object",
	additionalProperties: false,
	properties: {
		title: { type: "string", minLength: 1 },
		description: { type: "string", minLength: 1 },
		reason: { type: "string", minLength: 1 },
		year: { type: "string", minLength: 1 },
		type: { type: "string", minLength: 1 },
		publisher: { type: "string", minLength: 1 },
		artist: { type: "string", minLength: 1 },
		writer: { type: "string", minLength: 1 },
	},
	required: ["title", "description", "reason", "year", "type", "publisher", "artist", "writer"],
} as const;

const SYSTEM_INSTRUCTION =
	"You are a strict JSON generator. Output ONLY a single JSON object matching the provided schema. No markdown, no code fences, no commentary.";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const maybe = error as { status?: unknown };
	return typeof maybe.status === "number" ? maybe.status : undefined;
}

const SuggestionSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	reason: z.string().min(1),
	year: z.string().min(1),
	type: z.string().min(1),
	publisher: z.string().min(1),
	artist: z.string().min(1),
	writer: z.string().min(1),
});

function extractJsonObject(text: string): string | null {
	const stripped = text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
	const start = stripped.indexOf("{");
	const end = stripped.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) return null;
	return stripped.slice(start, end + 1);
}

function normalizeOption(input: string, allowed: readonly string[], aliases?: Record<string, string>): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const lower = trimmed.toLowerCase();
	const aliased = aliases?.[lower] ?? trimmed;

	// Exact match
	if (allowed.includes(aliased)) return aliased;

	// Case-insensitive match
	const found = allowed.find((v) => v.toLowerCase() === aliased.toLowerCase());
	return found ?? null;
}

export async function GET(request: NextRequest) {
	try {
		if (!GEMINI_API_KEY) {
			return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
		}

		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		// Extract previously shown comic titles from a URL parameter to avoid repetition
		const url = new URL(request.url);
		const previousTitlesRaw = url.searchParams.get("previous")
			? decodeURIComponent(url.searchParams.get("previous") || "").split("|")
			: [];
		// Keep prompt small for latency + cost
		const previousTitles = previousTitlesRaw.filter(Boolean).slice(-10);

		// Get user preferences from query parameters
		const userName = url.searchParams.get("name") || "";
		const userGenreRaw = url.searchParams.get("genre") || "";
		const userStyleRaw = url.searchParams.get("style") || "";
		const userExperienceRaw = url.searchParams.get("experience") || "";
		const userPurposeRaw = url.searchParams.get("purpose") || "";
		const userAgeRaw = url.searchParams.get("age") || "";

		const genreAliases: Record<string, string> = {
			"sci-fi": "Science Fiction",
			scifi: "Science Fiction",
			"science fiction": "Science Fiction",
			crime: "Crime/Noir",
			noir: "Crime/Noir",
			action: "Action/Adventure",
			adventure: "Action/Adventure",
			"action/adventure": "Action/Adventure",
			"slice of life": "Slice of Life",
		};

		const styleAliases: Record<string, string> = {
			modern: "Modern Age",
			golden: "Golden Age",
			silver: "Silver Age",
			bronze: "Bronze Age",
		};

		const userGenre = normalizeOption(userGenreRaw, comicGenres, genreAliases);
		const userStyle = normalizeOption(userStyleRaw, comicStyles, styleAliases);
		const userExperience = normalizeOption(userExperienceRaw, experienceLevels);
		const userPurpose = normalizeOption(userPurposeRaw, purposes);
		const userAge = userAgeRaw.trim() || "";

		if (userGenreRaw.trim() && !userGenre) {
			return NextResponse.json({ error: "Invalid genre", allowed: comicGenres }, { status: 400 });
		}
		if (userStyleRaw.trim() && !userStyle) {
			return NextResponse.json({ error: "Invalid style", allowed: comicStyles }, { status: 400 });
		}
		if (userExperienceRaw.trim() && !userExperience) {
			return NextResponse.json({ error: "Invalid experience", allowed: experienceLevels }, { status: 400 });
		}
		if (userPurposeRaw.trim() && !userPurpose) {
			return NextResponse.json({ error: "Invalid purpose", allowed: purposes }, { status: 400 });
		}
		if (userAge && !/^\d{1,3}$/.test(userAge)) {
			return NextResponse.json(
				{ error: "Invalid age", message: "age must be a whole number in years" },
				{ status: 400 },
			);
		}

		// Use user's preferred genre if provided, otherwise pick random from the same allowed list used by the UI.
		const selectedGenre = userGenre ?? comicGenres[Math.floor(Math.random() * comicGenres.length)];
		const selectedGenrePrompt = selectedGenre.toLowerCase();
		const randomSeed = Math.floor(Math.random() * 10000);

		// Build a personalized prompt based on user preferences
		let prompt = `Suggest one ${selectedGenrePrompt} comic recommendation.`;
		if (previousTitles.length > 0) {
			prompt += ` Avoid: ${previousTitles.join(", ")}.`;
		}
		prompt += ` Random seed: ${randomSeed}.`;

		// Add personalization based on user inputs
		if (userName) {
			prompt += `\nThis recommendation is for ${userName}.`;
		}

		if (userAge) {
			prompt += `\nTheir age is ${userAge}. Keep content and themes age-appropriate.`;
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

		prompt += `\n\nRules: pick a real, notable title; include creative team; do not pick overused defaults unless truly relevant.`;
		if (userExperience && userExperience.includes("Beginner")) prompt += ` Keep it beginner-friendly.`;
		if (userExperience && userExperience.includes("Casual"))
			prompt += ` A balance of accessibility and depth is preferred.`;
		if (userExperience && userExperience.includes("Intermediate")) prompt += ` A moderate complexity is fine.`;
		if (userExperience && userExperience.includes("Advanced"))
			prompt += ` You can choose more complex themes and storytelling.`;
		if (userExperience && userExperience.includes("Expert")) prompt += ` You may go more obscure/complex.`;

		prompt += `\n\nReturn ONLY JSON with these keys: title, description, reason, year, type, publisher, artist, writer.`;
		prompt += `\nAll values must be non-empty strings (no null/undefined).`;
		prompt += `\nDo not include extra keys.`;

		const baseConfig = {
			responseMimeType: "application/json",
			responseJsonSchema: SuggestionResponseJsonSchema,
			maxOutputTokens: 900,
			temperature: 0.6,
			seed: randomSeed,
			systemInstruction: {
				role: "system",
				parts: [{ text: SYSTEM_INSTRUCTION }],
			},
		} as const;

		const parseAndValidate = (text: string) => {
			const candidate = extractJsonObject(text) ?? text.trim();
			let parsed: unknown;
			try {
				parsed = JSON.parse(candidate);
			} catch {
				parsed = JSON.parse(jsonrepair(candidate));
			}

			const validated = SuggestionSchema.safeParse(parsed);
			if (!validated.success) {
				const error = new Error("INVALID_SHAPE");
				(error as any).issues = validated.error.issues;
				(error as any).candidatePreview = candidate.slice(0, 500);
				throw error;
			}

			return validated.data;
		};

		const generateTextOnce = async (contents: string, config: any) => {
			const result = await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				contents,
				config,
			});
			return (result.text ?? "").trim();
		};

		let text: string | null = null;
		let suggestion: z.infer<typeof SuggestionSchema> | null = null;

		// Attempt 1: normal generation.
		try {
			text = await generateTextOnce(prompt, baseConfig);
			if (!text) throw new Error("EMPTY_RESPONSE");
			suggestion = parseAndValidate(text);
		} catch (error) {
			// If the model is overloaded, do a single short backoff retry.
			if (getErrorStatus(error) === 503) {
				await sleep(650);
				try {
					text = await generateTextOnce(prompt, baseConfig);
					if (!text) throw new Error("EMPTY_RESPONSE");
					suggestion = parseAndValidate(text);
				} catch (retryError) {
					if (getErrorStatus(retryError) === 503) {
						return NextResponse.json(
							{ error: "The model is overloaded. Please try again later." },
							{ status: 503, headers: { "Retry-After": "2" } },
						);
					}
					error = retryError;
				}
			}

			// If we got invalid/truncated JSON, do one corrective retry with stricter settings.
			if (!suggestion) {
				const candidatePreview =
					typeof error === "object" && error && "candidatePreview" in error
						? String((error as any).candidatePreview)
						: (text ?? "").slice(0, 500);

				const correctivePrompt =
					prompt +
					`\n\nYour previous output was invalid or incomplete JSON. Output a corrected, complete JSON object that matches the schema exactly.` +
					`\nPrevious output (truncated):\n${candidatePreview}`;

				try {
					text = await generateTextOnce(correctivePrompt, {
						...baseConfig,
						temperature: 0.2,
						maxOutputTokens: 900,
					});
					if (!text) throw new Error("EMPTY_RESPONSE");
					suggestion = parseAndValidate(text);
				} catch (finalError) {
					if (getErrorStatus(finalError) === 503) {
						return NextResponse.json(
							{ error: "The model is overloaded. Please try again later." },
							{ status: 503, headers: { "Retry-After": "2" } },
						);
					}

					if (typeof finalError === "object" && finalError && "issues" in finalError) {
						console.error("Model JSON failed validation:", {
							errors: (finalError as any).issues,
							candidatePreview: (finalError as any).candidatePreview,
						});
						return NextResponse.json({ error: "Model returned unexpected JSON shape" }, { status: 502 });
					}

					console.error("Model returned invalid JSON:", {
						candidatePreview: (text ?? "").slice(0, 500),
					});
					return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
				}
			}
		}

		if (!suggestion) {
			return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 502 });
		}

		// No fallback data: return suggestion ASAP. Client can call /api/comic-suggestion/enrich.
		return NextResponse.json({
			suggestion: {
				...suggestion,
				imageUrl: null,
				link: null,
			},
			meta: {
				selectedGenre,
				style: userStyle ?? null,
				experience: userExperience ?? null,
				purpose: userPurpose ?? null,
				age: userAge || null,
			},
		});
	} catch (error) {
		const status = getErrorStatus(error);
		if (status === 503) {
			return NextResponse.json(
				{ error: "The model is overloaded. Please try again later." },
				{ status: 503, headers: { "Retry-After": "2" } },
			);
		}

		console.error("Error generating comic suggestion:", error);
		return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 500 });
	}
}
