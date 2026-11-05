// Reads a comic cover and fills the sell / edit listing form.
//
// Called from the browser with supabase.functions.invoke("analyze-cover"), so it
// runs with the default verify_jwt = true: only logged-in users get through.
//
// 1. Gemini identifies the cover (series, issue, year, language) and guesses
//    every field.
// 2. Comic databases are asked in parallel, chosen by origin:
//      Brazilian → Guia dos Quadrinhos, Comic Vine
//      otherwise → Metron, Comic Vine
// 3. Per field, the first database (in that order) with a value wins; Gemini's
//    guess fills the rest. Genre always comes from Gemini.
//
// Request:  { imageUrl, fields?: CoverField[], context?: Partial<CoverValues> }
// Response: { recognised, confidence, values, sources, matches }
//
// Secrets: GEMINI_API_KEY, COMIC_VINE_API_KEY, METRON_API_AUTH_HEADER, SITE_URL (Guia route)

import { supabaseAdmin } from "../_shared/admin.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";
import { fetchInlineImage } from "../_shared/gemini.ts";
import { aiValues, identifyCover, type GeminiCover } from "../_shared/identify-cover.ts";
import { COVER_FIELDS, type CoverField, type CoverValues } from "../_shared/comic-options.ts";
import { parseTitle } from "../_shared/cover-text.ts";
import { mergeValues, sourceOrder } from "../_shared/sources/merge.ts";
import { comicvine } from "../_shared/sources/comicvine.ts";
import { guia } from "../_shared/sources/guia.ts";
import { metron } from "../_shared/sources/metron.ts";
import type { Identification, SourceAdapter, SourceResult } from "../_shared/sources/types.ts";

const LOOKUPS_PER_HOUR = 30;
const MIN_CONFIDENCE = 0.4;

const ADAPTERS: Record<SourceResult["source"], { run: SourceAdapter; timeoutMs: number }> = {
	// The Guia scraper sits behind a Cloudflare check and may fall back to slow proxies.
	guia: { run: guia, timeoutMs: 15_000 },
	metron: { run: metron, timeoutMs: 8_000 },
	comicvine: { run: comicvine, timeoutMs: 8_000 },
};

async function runSource(name: SourceResult["source"], id: Identification): Promise<SourceResult | null> {
	const { run, timeoutMs } = ADAPTERS[name];
	const started = Date.now();
	try {
		const result = await run(id, AbortSignal.timeout(timeoutMs));
		console.log(`source ${name}: ${result ? "match" : "no match"} in ${Date.now() - started}ms`);
		return result;
	} catch (err) {
		console.warn(`source ${name} failed after ${Date.now() - started}ms:`, (err as Error).message);
		return null;
	}
}

/** Only covers uploaded to our own bucket, so the function can't be used to fetch arbitrary URLs. */
function isOwnCover(url: unknown): url is string {
	const prefix = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/comics-images/`;
	return typeof url === "string" && url.startsWith(prefix) && !url.includes("..");
}

/** 30 lookups per user per hour, counted in public.ai_cover_lookups (service role only). */
async function overRateLimit(userId: string): Promise<boolean> {
	const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const { count, error } = await supabaseAdmin
		.from("ai_cover_lookups")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.gte("created_at", since);
	if (error) {
		console.error("rate-limit check failed:", error.message);
		return false; // don't block sellers because the counter is unavailable
	}
	if ((count ?? 0) >= LOOKUPS_PER_HOUR) return true;
	const { error: insertError } = await supabaseAdmin.from("ai_cover_lookups").insert({ user_id: userId });
	if (insertError) console.error("rate-limit insert failed:", insertError.message);
	return false;
}

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
	if (req.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

	// verify_jwt already checked the signature; resolve which user this is.
	const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
	const { data: auth } = await supabaseAdmin.auth.getUser(token);
	if (!auth?.user) return corsJson({ error: "You need to be logged in to use the AI lookup." }, 401);

	const body = await req.json().catch(() => null);
	if (!body || !isOwnCover(body.imageUrl)) return corsJson({ error: "Upload a cover image first." }, 400);

	const fields: CoverField[] = Array.isArray(body.fields) && body.fields.length
		? body.fields.filter((f: unknown): f is CoverField => COVER_FIELDS.includes(f as CoverField))
		: [...COVER_FIELDS];
	if (!fields.length) return corsJson({ error: "Unknown field." }, 400);

	const context: Partial<CoverValues> = {};
	if (body.context && typeof body.context === "object") {
		for (const f of COVER_FIELDS) {
			const v = body.context[f];
			if ((typeof v === "string" && v.trim()) || (typeof v === "number" && v > 0)) {
				(context as Record<string, unknown>)[f] = v;
			}
		}
	}

	if (await overRateLimit(auth.user.id)) {
		return corsJson({ error: "Too many AI lookups. Please try again in an hour." }, 429);
	}

	const image = await fetchInlineImage(body.imageUrl).catch(() => null);
	if (!image) return corsJson({ error: "Couldn't read the cover image (JPEG/PNG/WebP up to 4 MB)." }, 422);

	let cover: GeminiCover;
	try {
		cover = await identifyCover(image, context);
	} catch (err) {
		console.error("Gemini identification failed:", err);
		return corsJson({ error: "The AI is busy right now. Please try again in a moment." }, 503);
	}

	// Values the seller typed beat what Gemini read off the cover.
	const typed = parseTitle(context.title);
	const id: Identification = {
		series: typed.series || cover.series?.trim() || "",
		issue: typed.issue || String(cover.issue_number ?? "").replace(/[^0-9]/g, ""),
		publisher: context.publisher || cover.publisher || "",
		year: Number(context.release_date?.slice(0, 4)) || cover.cover_year || null,
		language: cover.language || "",
		country: cover.country || "",
	};

	const recognised = !!context.title || (cover.is_comic_cover && cover.confidence >= MIN_CONFIDENCE && !!id.series);
	if (!recognised) {
		return corsJson({ recognised: false, confidence: cover.confidence ?? 0, values: {}, sources: {}, matches: [] });
	}

	// Ask the databases in parallel; keep their priority order for the merge.
	const order = sourceOrder(id);
	const results = (await Promise.all(order.map((name) => runSource(name, id)))).filter(
		(r): r is SourceResult => r !== null,
	);

	const { values, sources } = mergeValues(fields, results, aiValues(cover));
	const matches = results.filter((r) => r.url).map((r) => ({ source: r.source, url: r.url }));

	console.log(`analyze-cover user=${auth.user.id} id=${JSON.stringify(id)} order=${order} fields=${fields.length} sources=${JSON.stringify(sources)}`);

	return corsJson({ recognised: true, confidence: cover.confidence ?? 0, values, sources, matches });
});
