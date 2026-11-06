// Server-only helpers for releasing checkout holds (pending orders whose stock
// reserve_order() took). Used by /api/create-order (replacing an earlier hold)
// and /api/cancel-order (timer expiry or closing checkout). The same rules run
// unattended in the checkout-maintenance Edge Function.

import Stripe from "stripe";
import { supabaseAdmin } from "@/utils/supabase/admin-client";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: "2024-06-20",
});

type Hold = { id: number; stripe_payment_intent_id: string | null };

/**
 * Cancels the hold's PaymentIntent and gives its stock back.
 * Returns "in_payment" (and changes nothing) when Stripe has already taken or
 * is taking the payment; the stripe-webhook Edge Function settles those.
 */
export async function releaseHold(hold: Hold): Promise<"released" | "in_payment"> {
	if (hold.stripe_payment_intent_id) {
		const intent = await stripe.paymentIntents.retrieve(hold.stripe_payment_intent_id).catch(() => null);
		if (intent && (intent.status === "succeeded" || intent.status === "processing")) return "in_payment";
		if (intent && intent.status !== "canceled") {
			await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
		}
	}
	await supabaseAdmin.rpc("release_order", { p_order_id: hold.id, p_status: "cancelled" });
	return "released";
}

/** Releases every pending hold of this buyer (optionally only one order). */
export async function releaseHoldsOf(userId: string, orderId?: number): Promise<"released" | "in_payment" | "none"> {
	let query = supabaseAdmin.from("orders").select("id, stripe_payment_intent_id").eq("user_id", userId).eq("status", "pending");
	if (orderId !== undefined) query = query.eq("id", orderId);
	const { data: pending } = await query;

	let result: "released" | "in_payment" | "none" = "none";
	for (const hold of pending ?? []) {
		const r = await releaseHold(hold);
		if (r === "in_payment" || result === "none") result = r;
	}
	return result;
}
