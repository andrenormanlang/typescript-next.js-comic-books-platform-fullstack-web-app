import { z } from "zod";

// What the browser may send to /api/create-order. Prices, titles and the total
// are looked up in the database by reserve_order(); the client only says which
// comics and how many.
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
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
