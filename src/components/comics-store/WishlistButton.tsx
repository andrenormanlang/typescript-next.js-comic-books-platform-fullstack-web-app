"use client";

import { IconButton, type IconButtonProps } from "@chakra-ui/react";
import { Heart } from "lucide-react";
import { toaster } from "@/components/ui/toaster";
import { useUser } from "@/contexts/UserContext";
import { useToggleWishlist, useWishlist } from "@/hooks/comics-sale/useWishlist";

type WishlistButtonProps = { comicId: string } & Omit<IconButtonProps, "aria-label" | "onClick">;

export default function WishlistButton({ comicId, ...props }: WishlistButtonProps) {
	const { user } = useUser();
	const { isWishlisted } = useWishlist();
	const toggle = useToggleWishlist();
	const saved = isWishlisted(comicId);

	const onClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // cards navigate on click
		if (!user) {
			toaster.create({
				title: "Login required",
				description: "Log in to save comics to your wishlist.",
				type: "warning",
				duration: 5000,
			});
			return;
		}
		toggle.mutate(
			{ comicId, add: !saved },
			{
				onError: (error) =>
					toaster.create({ title: "Wishlist", description: (error as Error).message, type: "error", duration: 5000 }),
			}
		);
	};

	return (
		<IconButton
			aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
			aria-pressed={saved}
			title={saved ? "Remove from wishlist" : "Add to wishlist"}
			colorPalette="pink"
			variant={saved ? "solid" : "subtle"}
			onClick={onClick}
			{...props}
		>
			<Heart fill={saved ? "currentColor" : "none"} />
		</IconButton>
	);
}
