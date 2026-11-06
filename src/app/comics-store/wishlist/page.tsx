"use client";

import NextLink from "next/link";
import { useDispatch } from "react-redux";
import {
	Badge,
	Box,
	Button,
	Center,
	Container,
	Flex,
	Heading,
	HStack,
	Image,
	SimpleGrid,
	Spinner,
	Stack,
	Text,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useUser } from "@/contexts/UserContext";
import { useToggleWishlist, useWishlist } from "@/hooks/comics-sale/useWishlist";
import { addToCart } from "@/store/cartSlice";
import { AppDispatch } from "@/store/store";
import { getThumbnailUrl } from "@/lib/storage/thumbnail";
import { WishlistItem } from "@/types/comics-store/comic-detail.type";
import Price from "@/components/comics-store/Price";

const PLACEHOLDER = "/halftone.png";

export default function WishlistPage() {
	const { user } = useUser();
	const dispatch = useDispatch<AppDispatch>();
	const { data: items, isLoading, error } = useWishlist();
	const toggle = useToggleWishlist();

	const remove = (comicId: string) => toggle.mutate({ comicId, add: false });

	// Stock is only reserved at checkout, so this just moves the item.
	const moveToCart = async (item: WishlistItem) => {
		if (!user || !item.comic) return;
		try {
			await dispatch(
				addToCart({
					userId: user.id,
					comicId: item.comic.id,
					quantity: 1,
					title: item.comic.title,
					image: item.comic.image,
					price: item.comic.price,
					currency: item.comic.currency,
					stock: item.comic.stock,
				})
			).unwrap();
			remove(item.comic_id);
			toaster.create({ title: "Moved to cart", description: item.comic.title, type: "success", duration: 4000 });
		} catch (err) {
			toaster.create({
				title: "Could not add to cart",
				description: typeof err === "string" ? err : (err as Error)?.message,
				type: "error",
				duration: 5000,
			});
		}
	};

	if (isLoading) {
		return (
			<Center py={20}>
				<Spinner size="xl" />
			</Center>
		);
	}

	if (error) {
		return (
			<Center py={20}>
				<Text color="red.500">{(error as Error).message}</Text>
			</Center>
		);
	}

	return (
		<Container maxW="5xl" py={8}>
			<Heading size="2xl" mb={6}>
				My Wishlist
			</Heading>

			{!items?.length ? (
				<Stack align="center" gap={4} py={16}>
					<Text color="fg.muted">Your wishlist is empty. Tap the heart on any comic to save it here.</Text>
					<Button asChild colorPalette="yellow">
						<NextLink href="/comics-store/buy">Browse comics</NextLink>
					</Button>
				</Stack>
			) : (
				<SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
					{items.map((item) => {
						const comic = item.comic;
						const available = !!comic && comic.is_approved && comic.stock > 0;
						return (
							<Flex key={item.id} borderWidth="1px" rounded="md" p={3} gap={4} align="center">
								<Image
									src={getThumbnailUrl(comic?.image) || comic?.image || PLACEHOLDER}
									alt={comic?.title ?? "Comic"}
									boxSize="90px"
									objectFit="cover"
									rounded="sm"
									onError={(e) => {
										const img = e.currentTarget;
										if (comic?.image && img.src !== comic.image) img.src = comic.image;
										else img.src = PLACEHOLDER;
									}}
								/>
								<Box flex="1" minW={0}>
									{comic ? (
										<NextLink href={`/comics-store/buy/${comic.id}`}>
											<Text fontWeight="bold" truncate>
												{comic.title}
											</Text>
										</NextLink>
									) : (
										<Text fontWeight="bold">Loading…</Text>
									)}
									{comic && (
										<HStack mt={1} gap={2} flexWrap="wrap">
											<Price amount={Number(comic.price)} currency={comic.currency} layout="inline" />
											<Badge colorPalette={available ? "green" : "gray"}>
												{available ? `${comic.stock} in stock` : "Out of stock"}
											</Badge>
										</HStack>
									)}
									<HStack mt={3} gap={2}>
										<Button size="sm" colorPalette="yellow" disabled={!available} onClick={() => moveToCart(item)}>
											Move to cart
										</Button>
										<Button size="sm" variant="ghost" onClick={() => remove(item.comic_id)}>
											Remove
										</Button>
									</HStack>
								</Box>
							</Flex>
						);
					})}
				</SimpleGrid>
			)}
		</Container>
	);
}
