// src/app/api/create-order/route.ts
//
// Reserves stock and creates a pending order + Stripe PaymentIntent.
// The order is marked paid only by the stripe-webhook Edge Function
// (supabase/functions/stripe-webhook). Unpaid holds expire after 30 minutes
// (supabase/functions/checkout-maintenance).

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin-client";
import { createOrderSchema } from "@/lib/validations/checkout";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: "2024-06-20",
});

type ReservedOrder = {
	id: number;
	total_amount: number;
	currency: string;
};

async function releasePreviousHolds(userId: string) {
	const { data: pending } = await supabaseAdmin
		.from("orders")
		.select("id, stripe_payment_intent_id")
		.eq("user_id", userId)
		.eq("status", "pending");

	for (const old of pending ?? []) {
		if (old.stripe_payment_intent_id) {
			const intent = await stripe.paymentIntents.retrieve(old.stripe_payment_intent_id).catch(() => null);
			// Paid or mid-payment: leave it for the webhook.
			if (intent && (intent.status === "succeeded" || intent.status === "processing")) continue;
			if (intent && intent.status !== "canceled") {
				await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
			}
		}
		await supabaseAdmin.rpc("release_order", { p_order_id: old.id, p_status: "cancelled" });
	}
}

export async function POST(request: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "You need to be logged in to check out" }, { status: 401 });
	}

	const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid cart" }, { status: 400 });
	}

	// 0. Re-opening checkout replaces the buyer's earlier unpaid hold; otherwise
	//    their own pending order would make a single-copy comic look sold out.
	await releasePreviousHolds(user.id);

	// 1. Reserve stock and create the pending order in one transaction.
	const { data: order, error: reserveError } = await supabaseAdmin
		.rpc("reserve_order", {
			p_user_id: user.id,
			p_items: parsed.data.items.map((i) => ({ comic_id: i.comicId, quantity: i.quantity })),
		})
		.single<ReservedOrder>();

	if (reserveError || !order) {
		const message = reserveError?.message ?? "";
		if (message.startsWith("insufficient_stock:")) {
			return NextResponse.json(
				{
					error: "Sorry, one of the comics in your cart just sold out.",
					comicId: message.split(":")[1],
				},
				{ status: 409 }
			);
		}
		console.error("reserve_order failed:", reserveError);
		return NextResponse.json({ error: "Could not create your order" }, { status: 500 });
	}

	// 2. Create the PaymentIntent for the amount the database computed.
	try {
		const paymentIntent = await stripe.paymentIntents.create(
			{
				amount: Math.round(Number(order.total_amount) * 100), // major → minor units
				currency: order.currency,
				automatic_payment_methods: { enabled: true },
				metadata: { order_id: String(order.id), user_id: user.id },
			},
			{ idempotencyKey: `order-${order.id}` }
		);

		const { error: linkError } = await supabaseAdmin
			.from("orders")
			.update({ stripe_payment_intent_id: paymentIntent.id })
			.eq("id", order.id);

		if (linkError) {
			await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
			throw linkError;
		}

		return NextResponse.json({
			clientSecret: paymentIntent.client_secret,
			orderId: order.id,
			amount: Number(order.total_amount),
		});
	} catch (error) {
		// Give the stock back; the order never became payable.
		await supabaseAdmin.rpc("release_order", { p_order_id: order.id, p_status: "cancelled" });
		console.error("Creating PaymentIntent failed:", error);
		return NextResponse.json({ error: "Payment could not be started" }, { status: 500 });
	}
}
