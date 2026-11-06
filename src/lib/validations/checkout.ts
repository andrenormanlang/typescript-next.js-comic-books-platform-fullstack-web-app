import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

// What the browser may send to /api/create-order. Prices, titles, the total and
// the currency conversion are done in the database by reserve_order(); the
// client only says which comics, how many, and which currency to pay in.
export const createOrderSchema = z.object({
	items: z
		.array(
			z.object({
				comicId: z.string().uuid(),
				quantity: z.number().int().min(1).max(99),
			})
		)
		.min(1, "Your cart is empty")
		.max(50)
		.refine((items) => new Set(items.map((i) => i.comicId)).size === items.length, {
			message: "Duplicate items in cart",
		}),
	currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const cancelOrderSchema = z.object({
	orderId: z.number().int().positive(),
});
