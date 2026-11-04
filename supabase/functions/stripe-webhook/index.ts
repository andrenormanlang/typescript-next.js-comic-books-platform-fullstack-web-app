// Stripe → Supabase webhook. Source of truth for "this order is paid".
//
// Stripe endpoint: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Deployed with verify_jwt = false (see supabase/config.toml); the Stripe
// signature is the authentication.

import { cryptoProvider, stripe, type Stripe } from "../_shared/stripe.ts";
import { releaseOrder, settleSucceededPayment } from "../_shared/orders.ts";
import { json } from "../_shared/http.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

function orderIdOf(intent: Stripe.PaymentIntent): number | null {
	const id = Number(intent.metadata?.order_id);
	return Number.isInteger(id) && id > 0 ? id : null;
}

Deno.serve(async (req) => {
	if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

	const signature = req.headers.get("stripe-signature");
	if (!signature) return json({ error: "Missing stripe-signature" }, 400);

	// The signature covers the raw body, so read it as text before parsing.
	const body = await req.text();

	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
	} catch (err) {
		console.warn("Signature verification failed:", (err as Error).message);
		return json({ error: "Invalid signature" }, 400);
	}

	try {
		switch (event.type) {
			case "payment_intent.succeeded": {
				const intent = event.data.object as Stripe.PaymentIntent;
				const result = await settleSucceededPayment(intent.id);
				console.log(`payment_intent.succeeded ${intent.id} → ${result}`);
				break;
			}
			case "payment_intent.payment_failed":
			case "payment_intent.canceled": {
				const intent = event.data.object as Stripe.PaymentIntent;
				const orderId = orderIdOf(intent);
				// A failed attempt can be retried with another card while the
				// PaymentIntent stays open, so only release on a final cancel.
				if (orderId && event.type === "payment_intent.canceled") {
					const released = await releaseOrder(orderId, "cancelled");
					console.log(`${event.type} ${intent.id} order ${orderId} released=${released}`);
				} else {
					console.log(`${event.type} ${intent.id} order ${orderId ?? "?"} (hold kept until expiry)`);
				}
				break;
			}
			default:
				console.log(`Ignoring ${event.type}`);
		}
	} catch (err) {
		// 500 makes Stripe retry later; the database functions are idempotent.
		console.error(`Handling ${event.type} ${event.id} failed:`, err);
		return json({ error: "Handler failed" }, 500);
	}

	return json({ received: true });
});
