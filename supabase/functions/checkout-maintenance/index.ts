// Expires unpaid checkout holds. Called every 10 minutes by pg_cron
// (supabase/migrations/20261104120100_checkout_cron.sql).
//
// For each pending order past expires_at:
//   PaymentIntent succeeded → settle it (the webhook was missed or late)
//   PaymentIntent processing → leave it; the webhook will settle it
//   anything else          → cancel it in Stripe, then release the stock
// Cancelling before releasing means a late payment can't land on stock that has
// already been freed; if one still slips through, mark_order_paid refunds it.

import { supabaseAdmin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";
import { releaseOrder, settleSucceededPayment } from "../_shared/orders.ts";
import { isInternalCall, json } from "../_shared/http.ts";

const BATCH = 100;

Deno.serve(async (req) => {
	if (!isInternalCall(req)) return json({ error: "Forbidden" }, 403);

	const { data: stale, error } = await supabaseAdmin
		.from("orders")
		.select("id, stripe_payment_intent_id")
		.eq("status", "pending")
		.eq("stock_reserved", true)
		.lt("expires_at", new Date().toISOString())
		.order("expires_at", { ascending: true })
		.limit(BATCH);

	if (error) {
		console.error("Loading stale orders failed:", error);
		return json({ error: error.message }, 500);
	}

	const summary = { checked: stale.length, expired: 0, recovered: 0, skipped: 0, errors: 0 };

	for (const order of stale) {
		try {
			const intentId = order.stripe_payment_intent_id as string | null;

			if (intentId) {
				const intent = await stripe.paymentIntents.retrieve(intentId);

				if (intent.status === "succeeded") {
					await settleSucceededPayment(intentId);
					summary.recovered++;
					continue;
				}
				if (intent.status === "processing") {
					summary.skipped++;
					continue;
				}
				if (intent.status !== "canceled") {
					await stripe.paymentIntents.cancel(intentId);
				}
			}

			if (await releaseOrder(order.id, "expired")) summary.expired++;
		} catch (err) {
			summary.errors++;
			console.error(`Order ${order.id} failed:`, err);
		}
	}

	console.log("checkout-maintenance", summary);
	return json(summary);
});
