import { z } from "zod";

export const wishlistItemSchema = z.object({
	comicId: z.string().uuid(),
});

export type WishlistItemInput = z.infer<typeof wishlistItemSchema>;
