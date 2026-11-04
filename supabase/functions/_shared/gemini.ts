// Deno port of the model-fallback logic in src/app/api/comic-suggestion/route.ts:
// try the newest model first, fall back when it is overloaded, rate-limited or
// slow. Returns the model's JSON text.

import { GoogleGenAI, ThinkingLevel } from "npm:@google/genai@1.38.0";

const MODELS = [
	{ name: "gemini-3.8-flash", timeoutMs: 12_000 },
	{ name: "gemini-3.6-flash", timeoutMs: 20_000 },
] as const;

// Errors worth retrying on another model (a 400 would fail on any model).
const FALLBACK_STATUSES = new Set([404, 429, 500, 503, 504]);

let ai: GoogleGenAI | null = null;
function client(): GoogleGenAI {
	const apiKey = Deno.env.get("GEMINI_API_KEY");
	if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
	ai ??= new GoogleGenAI({ apiKey });
	return ai;
}

function errorStatus(error: unknown): number | undefined {
	const status = (error as { status?: unknown } | null)?.status;
	return typeof status === "number" ? status : undefined;
}

export type InlineImage = { mimeType: string; base64: string };

export async function generateJson(opts: {
	prompt: string;
	schema: Record<string, unknown>;
	image?: InlineImage;
	system?: string;
}): Promise<{ text: string; model: string }> {
	const parts: Array<Record<string, unknown>> = [];
	if (opts.image) parts.push({ inlineData: { mimeType: opts.image.mimeType, data: opts.image.base64 } });
	parts.push({ text: opts.prompt });

	let lastError: unknown;
	for (const model of MODELS) {
		const signal = AbortSignal.timeout(model.timeoutMs);
		try {
			const result = await client().models.generateContent({
				model: model.name,
				contents: [{ role: "user", parts }],
				config: {
					responseMimeType: "application/json",
					responseJsonSchema: opts.schema,
					maxOutputTokens: 4096,
					thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
					temperature: 0.2,
					systemInstruction: opts.system
						? { role: "system", parts: [{ text: opts.system }] }
						: undefined,
					abortSignal: signal,
				},
			});
			return { text: (result.text ?? "").trim(), model: model.name };
		} catch (error) {
			const status = errorStatus(error);
			if (!signal.aborted && !(status && FALLBACK_STATUSES.has(status))) throw error;
			console.warn(`Gemini ${model.name} unavailable:`, signal.aborted ? "timeout" : `HTTP ${status}`);
			lastError = error;
		}
	}
	throw Object.assign(new Error("ALL_MODELS_UNAVAILABLE"), { cause: lastError });
}

// Fetch an image and return it base64-encoded for an inline Gemini part.
export async function fetchInlineImage(url: string, maxBytes = 4 * 1024 * 1024): Promise<InlineImage | null> {
	const res = await fetch(url);
	if (!res.ok) return null;
	const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
	if (!mimeType.startsWith("image/")) return null;
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.length > maxBytes) return null;
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return { mimeType, base64: btoa(binary) };
}
