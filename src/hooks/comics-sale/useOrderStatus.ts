import { useQuery } from "@tanstack/react-query";

export type OrderStatus = "pending" | "paid" | "expired" | "cancelled" | "refunded";

export type ReceiptItem = {
	comicId: string;
	title: string;
	image: string;
	price: number;
	currency: string;
	quantity: number;
};

export type Receipt = {
	id: number;
	order_id: number;
	user_id: string;
	total_amount: number;
	currency: string;
	items: ReceiptItem[];
	created_at: string;
};

type OrderStatusResponse = { status: OrderStatus; receipt: Receipt | null };

const POLL_MS = 2000;
const MAX_WAIT_MS = 60_000;

async function fetchOrderStatus(orderId: string): Promise<OrderStatusResponse> {
	const response = await fetch(`/api/payment-success?orderId=${encodeURIComponent(orderId)}`);
	const data = await response.json();
	if (!response.ok) throw new Error(data.error ?? "Failed to load your order");
	return data;
}

// Polls until the stripe-webhook Edge Function has marked the order paid
// (usually a second or two after Stripe redirects back), then stops.
export function useOrderStatus(orderId: string | null | undefined) {
	return useQuery({
		queryKey: ["order-status", orderId],
		queryFn: () => fetchOrderStatus(orderId!),
		enabled: !!orderId,
		refetchInterval: (query) => {
			if (query.state.data?.status !== "pending") return false;
			// Give up after ~MAX_WAIT_MS; the page then says the payment is still processing.
			return query.state.dataUpdateCount * POLL_MS < MAX_WAIT_MS ? POLL_MS : false;
		},
		retry: 1,
	});
}

