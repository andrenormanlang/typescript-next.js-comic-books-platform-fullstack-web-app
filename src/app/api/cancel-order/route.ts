// Releases the logged-in buyer's own checkout hold right away, so the comics
// go back on sale without waiting for checkout-maintenance (up to 10 minutes
// after the 30-minute hold ends). Called when the checkout timer runs out or
// the buyer closes checkout. A payment Stripe already took or is processing is
// left alone; the stripe-webhook Edge Function settles it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cancelOrderSchema } from "@/lib/validations/checkout";
import { releaseHoldsOf } from "@/lib/checkout/holds";

export async function POST(request: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "You need to be logged in" }, { status: 401 });
	}

	const parsed = cancelOrderSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid order" }, { status: 400 });
	}

	try {
		const result = await releaseHoldsOf(user.id, parsed.data.orderId);
		return NextResponse.json({ result });
	} catch (error) {
		console.error("Releasing hold failed:", error);
		return NextResponse.json({ error: "Could not release the reservation" }, { status: 500 });
	}
}
