import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WishlistItem } from "@/types/comics-store/comic-detail.type";
import { useUser } from "@/contexts/UserContext";

const wishlistKey = (userId?: string) => ["wishlist", userId] as const;

async function fetchWishlist(): Promise<WishlistItem[]> {
	const response = await fetch("/api/wishlist");
	const data = await response.json();
	if (!response.ok) throw new Error(data.error ?? "Failed to load wishlist");
	return data;
}

export function useWishlist() {
	const { user } = useUser();
	const query = useQuery({
		queryKey: wishlistKey(user?.id),
		queryFn: fetchWishlist,
		enabled: !!user,
		staleTime: 60_000,
	});

	const ids = new Set((query.data ?? []).map((item) => item.comic_id));
	return { ...query, isWishlisted: (comicId: string) => ids.has(comicId) };
}

// Add or remove one comic. Optimistic, so the heart flips immediately.
export function useToggleWishlist() {
	const { user } = useUser();
	const queryClient = useQueryClient();
	const key = wishlistKey(user?.id);

	return useMutation({
		mutationFn: async ({ comicId, add }: { comicId: string; add: boolean }) => {
			const response = add
				? await fetch("/api/wishlist", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ comicId }),
					})
				: await fetch(`/api/wishlist?comicId=${encodeURIComponent(comicId)}`, { method: "DELETE" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Wishlist update failed");
			return data;
		},
		onMutate: async ({ comicId, add }) => {
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<WishlistItem[]>(key);
			queryClient.setQueryData<WishlistItem[]>(key, (items = []) =>
				add
					? [{ id: `optimistic-${comicId}`, comic_id: comicId, created_at: new Date().toISOString(), comic: null }, ...items]
					: items.filter((item) => item.comic_id !== comicId)
			);
			return { previous };
		},
		onError: (_error, _vars, context) => {
			if (context?.previous) queryClient.setQueryData(key, context.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
	});
}
