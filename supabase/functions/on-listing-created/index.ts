// Runs when a comic is listed for sale (after-insert trigger on "comics-sell",
// see supabase/migrations/20261104120200_listing_automation.sql).
//
// 1. AI listing check: Gemini looks at the cover + listing text and stores an
//    advisory review in "comics-sell".ai_review. It never approves or rejects.
// 2. Admin email: tells admins a listing is waiting for approval, including the
//    AI flags. Sent even if the AI step fails.
//
// Secrets: INTERNAL_HOOK_SECRET, GEMINI_API_KEY, RESEND_API_KEY,
//          NOTIFY_FROM_EMAIL, SITE_URL

import { supabaseAdmin } from "../_shared/admin.ts";
import { fetchInlineImage, generateJson } from "../_shared/gemini.ts";
import { isInternalCall, json } from "../_shared/http.ts";

type AiReview = {
	cover_matches_title: boolean;
	quality_flags: string[];
	suggested_description: string | null;
	confidence: number;
	model?: string;
};

const REVIEW_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		cover_matches_title: { type: "boolean" },
		quality_flags: { type: "array", items: { type: "string" }, maxItems: 6 },
		suggested_description: { type: ["string", "null"] },
		confidence: { type: "number", minimum: 0, maximum: 1 },
	},
	required: ["cover_matches_title", "quality_flags", "suggested_description", "confidence"],
};

const SYSTEM =
	"You review second-hand comic book listings for a marketplace moderator. " +
	"Output ONLY a JSON object matching the schema. Be concise and factual.";

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function reviewListing(listing: Record<string, any>): Promise<AiReview> {
	const image = listing.image ? await fetchInlineImage(listing.image).catch(() => null) : null;

	const prompt = [
		"Listing:",
		`Title: ${listing.title}`,
		`Publisher: ${listing.publisher ?? "?"}`,
		`Release date: ${listing.release_date ?? "?"}`,
		`Writer / artist: ${listing.main_writer ?? "?"} / ${listing.main_artist ?? "?"}`,
		`Price: ${listing.price} ${listing.currency}`,
		`Description: ${listing.description ?? ""}`,
		"",
		image ? "The attached image is the cover the seller uploaded." : "No cover image could be loaded.",
		"Tasks:",
		"- cover_matches_title: does the cover plausibly show this title/issue? false if no image.",
		"- quality_flags: short problems a moderator should check (e.g. 'cover shows a different issue',",
		"  'description is empty or copy-pasted', 'price looks like a typo', 'not a comic'). Empty if fine.",
		"- suggested_description: 2-4 sentence description if the seller's is missing or very thin, else null.",
		"- confidence: 0-1, how sure you are overall.",
	].join("\n");

	const { text, model } = await generateJson({ prompt, schema: REVIEW_SCHEMA, image: image ?? undefined, system: SYSTEM });
	const parsed = JSON.parse(text) as AiReview;
	return { ...parsed, model };
}

async function adminEmails(): Promise<string[]> {
	const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("is_admin", true);
	const emails: string[] = [];
	for (const admin of admins ?? []) {
		const { data } = await supabaseAdmin.auth.admin.getUserById(admin.id);
		if (data.user?.email) emails.push(data.user.email);
	}
	return emails;
}

async function notifyAdmins(listing: Record<string, any>, seller: string, review: AiReview | null) {
	const apiKey = Deno.env.get("RESEND_API_KEY");
	const from = Deno.env.get("NOTIFY_FROM_EMAIL");
	const site = Deno.env.get("SITE_URL") ?? "";
	if (!apiKey || !from) {
		console.warn("RESEND_API_KEY / NOTIFY_FROM_EMAIL not set; skipping admin email");
		return;
	}

	const to = await adminEmails();
	if (to.length === 0) return;

	const flags = review
		? review.quality_flags.length
			? `<ul>${review.quality_flags.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
			: "<p>No issues flagged.</p>"
		: "<p>AI check unavailable.</p>";
	const coverNote = review && !review.cover_matches_title ? "<p><strong>⚠ Cover may not match the title.</strong></p>" : "";

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			from,
			to,
			subject: `New listing awaiting approval: ${listing.title}`,
			html: `
				<p><strong>${escapeHtml(listing.title)}</strong> was listed by ${escapeHtml(seller)}
				for ${escapeHtml(String(listing.price))} ${escapeHtml(listing.currency ?? "")}.</p>
				${coverNote}
				<p>AI check:</p>${flags}
				<p><a href="${site}/comics-store/admin-tables">Review it in the admin tables</a></p>`,
		}),
	});
	if (!res.ok) console.error("Resend failed:", res.status, await res.text());
}

Deno.serve(async (req) => {
	if (!isInternalCall(req)) return json({ error: "Forbidden" }, 403);

	const { id } = await req.json().catch(() => ({}));
	if (typeof id !== "string") return json({ error: "Missing id" }, 400);

	const { data: listing, error } = await supabaseAdmin
		.from("comics-sell")
		.select("*, profiles(username)")
		.eq("id", id)
		.maybeSingle();
	if (error || !listing) return json({ error: error?.message ?? "Listing not found" }, 404);

	let review: AiReview | null = null;
	try {
		review = await reviewListing(listing);
		await supabaseAdmin
			.from("comics-sell")
			.update({ ai_review: review, ai_reviewed_at: new Date().toISOString() })
			.eq("id", id);
	} catch (err) {
		console.error(`AI review of ${id} failed:`, err);
	}

	try {
		await notifyAdmins(listing, listing.profiles?.username ?? "a seller", review);
	} catch (err) {
		console.error(`Admin email for ${id} failed:`, err);
	}

	return json({ id, reviewed: !!review });
});
