import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";

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
		const userGenre = url.searchParams.get("genre") || "";
		const userStyle = url.searchParams.get("style") || "";
		const userExperience = url.searchParams.get("experience") || "";
		const userPurpose = url.searchParams.get("purpose") || "";

		// Use user's preferred genre if provided, otherwise pick random
		const selectedGenre = userGenre ? userGenre.toLowerCase() : genres[Math.floor(Math.random() * genres.length)];
		const randomSeed = Math.floor(Math.random() * 10000);

		// Build a personalized prompt based on user preferences
		let prompt = `Suggest one ${selectedGenre} comic recommendation.`;
		if (previousTitles.length > 0) {
			prompt += ` Avoid: ${previousTitles.join(", ")}.`;
		}
		prompt += ` Random seed: ${randomSeed}.`;

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

		prompt += `\n\nRules: pick a real, notable title; include creative team; do not pick overused defaults unless truly relevant.`;
		if (userExperience && userExperience.includes("Beginner")) prompt += ` Keep it beginner-friendly.`;
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
			meta: { selectedGenre },
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
