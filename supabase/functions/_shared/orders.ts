import { supabaseAdmin } from "./admin.ts";
import { stripe } from "./stripe.ts";

export type PaidResult = "paid" | "already_paid" | "needs_refund" | "unknown_order";

// Settle a succeeded PaymentIntent. Shared by the webhook and the maintenance
// job (which catches payments whose webhook was missed). Safe to call twice.
export async function settleSucceededPayment(paymentIntentId: string): Promise<PaidResult> {
	const { data, error } = await supabaseAdmin.rpc("mark_order_paid", {
		p_payment_intent_id: paymentIntentId,
	});
	if (error) throw new Error(`mark_order_paid failed: ${error.message}`);

	const result = data as PaidResult;

	if (result === "needs_refund") {
		// The hold expired and someone else bought the stock. The idempotency key
		// makes retries (redelivered events) refund only once.
		await stripe.refunds.create(
			{ payment_intent: paymentIntentId, reason: "requested_by_customer" },
			{ idempotencyKey: `refund-${paymentIntentId}` },
		);
	}

	return result;
}

export async function releaseOrder(orderId: number, status: "expired" | "cancelled"): Promise<boolean> {
	const { data, error } = await supabaseAdmin.rpc("release_order", {
		p_order_id: orderId,
		p_status: status,
	});
	if (error) throw new Error(`release_order failed: ${error.message}`);
	return data as boolean;
}
