// Read-only order status + receipt for the logged-in buyer.
// Receipts are created by the stripe-webhook Edge Function; this route never
// writes. The success page polls it until status is "paid".

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin-client";

export async function GET(request: NextRequest) {
	const orderId = Number(new URL(request.url).searchParams.get("orderId"));
	if (!Number.isInteger(orderId) || orderId <= 0) {
		return NextResponse.json({ error: "Missing or invalid orderId" }, { status: 400 });
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "You need to be logged in" }, { status: 401 });
	}

	// Admin client + explicit user_id filter: only the buyer sees their order.
	const { data: order, error: orderError } = await supabaseAdmin
		.from("orders")
		.select("id, status")
		.eq("id", orderId)
		.eq("user_id", user.id)
		.maybeSingle();

	if (orderError) {
		console.error("Fetching order failed:", orderError);
		return NextResponse.json({ error: "Could not load your order" }, { status: 500 });
	}
	if (!order) {
		return NextResponse.json({ error: "Order not found" }, { status: 404 });
	}

	let receipt = null;
	if (order.status === "paid") {
		const { data } = await supabaseAdmin.from("receipts").select("*").eq("order_id", order.id).maybeSingle();
		receipt = data;
	}

	return NextResponse.json({ status: order.status, receipt });
}
