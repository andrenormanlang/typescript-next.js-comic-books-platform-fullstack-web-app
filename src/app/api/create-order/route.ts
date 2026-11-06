// src/app/api/create-order/route.ts
//
// Reserves stock and creates a pending order + Stripe PaymentIntent in the
// buyer's currency. reserve_order() converts the prices on the server
// (supabase/migrations/20261106100000_currency_conversion.sql).
// The order is marked paid only by the stripe-webhook Edge Function
// (supabase/functions/stripe-webhook). Unpaid holds expire after 30 minutes
// (supabase/functions/checkout-maintenance); the checkout panel counts down to
// expiresAt and releases the hold itself via /api/cancel-order.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin-client";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations/checkout";
import { releaseHoldsOf, stripe } from "@/lib/checkout/holds";
import { CURRENCY_COOKIE, isCurrency } from "@/lib/currency";

type ReservedOrder = {
	id: number;
	total_amount: number;
	currency: string;
	expires_at: string;
};

type ReserveResult = { order: ReservedOrder | null; error: { message: string } | null };

async function reserve(userId: string, items: CreateOrderInput["items"], currency: string | null) {
	const { data, error } = await supabaseAdmin
		.rpc("reserve_order", {
			p_user_id: userId,
			p_items: items.map((i) => ({ comic_id: i.comicId, quantity: i.quantity })),
			p_currency: currency,
		})
		.single<ReservedOrder>();
	return { order: data, error } as ReserveResult;
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

	const cookieCurrency = request.cookies.get(CURRENCY_COOKIE)?.value;
	const wanted = parsed.data.currency ?? (isCurrency(cookieCurrency) ? cookieCurrency : null);

	// 0. Re-opening checkout replaces the buyer's earlier unpaid hold; otherwise
	//    their own pending order would make a single-copy comic look sold out.
	await releaseHoldsOf(user.id);

	// 1. Reserve stock and create the pending order in one transaction.
	let { order, error: reserveError } = await reserve(user.id, parsed.data.items, wanted);
	let notice: string | null = null;

	// No fresh exchange rates: a cart in a single currency can still be paid in
	// that currency (null lets reserve_order pick it). A mixed cart can't.
	if (reserveError?.message.startsWith("rates_unavailable:")) {
		({ order, error: reserveError } = await reserve(user.id, parsed.data.items, null));
		if (order) notice = `Live exchange rates are unavailable, so this order is charged in ${order.currency}.`;
	}

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
		if (message.startsWith("rates_unavailable:")) {
			return NextResponse.json(
				{
					error:
						"Your cart has comics priced in different currencies and live exchange rates are unavailable right now. Please try again later, or check out one currency at a time.",
				},
				{ status: 503 }
			);
		}
		console.error("reserve_order failed:", reserveError);
		return NextResponse.json({ error: "Could not create your order" }, { status: 500 });
	}

	// 2. Create the PaymentIntent for the amount and currency the database computed.
	//    Every supported currency has two decimals, so ×100 gives minor units.
	try {
		const paymentIntent = await stripe.paymentIntents.create(
			{
				amount: Math.round(Number(order.total_amount) * 100),
				currency: order.currency.toLowerCase(),
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
			currency: order.currency.toUpperCase(),
			expiresAt: order.expires_at,
			// Lets the browser correct for a wrong local clock in the countdown.
			serverNow: new Date().toISOString(),
			notice,
		});
	} catch (error) {
		// Give the stock back; the order never became payable.
		await supabaseAdmin.rpc("release_order", { p_order_id: order.id, p_status: "cancelled" });
		console.error("Creating PaymentIntent failed:", error);
		return NextResponse.json({ error: "Payment could not be started" }, { status: 500 });
	}
}
