// The logged-in user's wishlist. Uses the cookie-bound session client, so the
// owner-only RLS policies on public.wishlist enforce access.
//
// GET                    → WishlistItem[] (newest first, with comic details)
// POST   { comicId }     → add (idempotent)
// DELETE ?comicId=<uuid> → remove

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { wishlistItemSchema } from "@/lib/validations/wishlist";

async function sessionClient() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return { supabase, user };
}

const unauthorized = () => NextResponse.json({ error: "You need to be logged in" }, { status: 401 });

export async function GET() {
	const { supabase, user } = await sessionClient();
	if (!user) return unauthorized();

	const { data, error } = await supabase
		.from("wishlist")
		.select(
			`id, comic_id, created_at,
			 comic:comic_id (id, title, image, price, currency, stock, publisher, release_date, is_approved)`
		)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Loading wishlist failed:", error);
		return NextResponse.json({ error: "Could not load your wishlist" }, { status: 500 });
	}

	return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
	const { supabase, user } = await sessionClient();
	if (!user) return unauthorized();

	const parsed = wishlistItemSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: "Invalid comic" }, { status: 400 });

	const { error } = await supabase
		.from("wishlist")
		.upsert({ user_id: user.id, comic_id: parsed.data.comicId }, { onConflict: "user_id,comic_id", ignoreDuplicates: true });

	if (error) {
		console.error("Adding to wishlist failed:", error);
		return NextResponse.json({ error: "Could not add to your wishlist" }, { status: 500 });
	}

	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
	const { supabase, user } = await sessionClient();
	if (!user) return unauthorized();

	const parsed = wishlistItemSchema.safeParse({ comicId: new URL(request.url).searchParams.get("comicId") });
	if (!parsed.success) return NextResponse.json({ error: "Invalid comic" }, { status: 400 });

	const { error } = await supabase
		.from("wishlist")
		.delete()
		.eq("user_id", user.id)
		.eq("comic_id", parsed.data.comicId);

	if (error) {
		console.error("Removing from wishlist failed:", error);
		return NextResponse.json({ error: "Could not remove from your wishlist" }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
