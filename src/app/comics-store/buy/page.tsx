"use client";

import { useEffect, useState } from "react";
import {
	SimpleGrid,
	Box,
	Image,
	Text,
	Container,
	Center,
	Spinner,
	Alert,
	IconButton,
	Button,
	Dialog,
	Badge,
	Stack,
	Portal,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { motion } from "framer-motion";
import NextLink from "next/link";

const MotionDiv = motion.div as any;
import { Trash2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { Comic } from "@/types/comics-store/comic-detail.type";
import { NextPage } from "next";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, updateCartQuantity } from "@/store/cartSlice";
import { AppDispatch, RootState } from "@/store/store";
import { useUser } from "@/contexts/UserContext";
import { useUpdateStock } from "@/hooks/stock-management/useUpdateStock";
import { useInfiniteComics } from "@/hooks/comics-sale/useInfiniteComics";
import { useInView } from "react-intersection-observer";
import SearchBar from "@/components/comics-store/search";

const defaultImageUrl = "/halftone.png";

const formatDate = (dateString: string) => {
	const options: Intl.DateTimeFormatOptions = {
		day: "numeric",
		month: "short",
		year: "numeric",
	};
	return new Date(dateString).toLocaleDateString(undefined, options);
};

const ComicsBuy: NextPage = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [loadingComicIds, setLoadingComicIds] = useState<string[]>([]);
	const { user } = useUser();
	const router = useRouter();
	const dispatch: AppDispatch = useDispatch();
	const cart = useSelector((state: RootState) => state.cart.items);
	const { mutate: updateStock } = useUpdateStock();
	const { ref, inView } = useInView();

	const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteComics(searchQuery);

	const onClose = () => setIsOpen(false);

	useEffect(() => {
		const fetchUserProfile = async () => {
			if (user) {
				const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();

				if (error) {
					console.error("Error fetching profile:", error.message);
					return;
				}

				if (data && data.is_admin) {
					setIsAdmin(true);
				}
			}
		};

		fetchUserProfile();
	}, [user]);

	useEffect(() => {
		if (inView && hasNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, fetchNextPage]);

	const handleDelete = async () => {
		if (selectedComic) {
			try {
				const { error } = await supabase.from("comics-sell").delete().eq("id", selectedComic.id);

				if (error) throw error;

				toaster.create({
					title: "Comic deleted.",
					description: "The comic has been successfully deleted.",
					type: "success",
					duration: 5000,
				});

				// The useQuery hook will automatically refetch the data after a successful mutation.
			} catch (error) {
				toaster.create({
					title: "Error deleting comic.",
					description: "There was an error deleting the comic.",
					type: "error",
					duration: 5000,
				});
			} finally {
				setIsOpen(false);
			}
		}
	};

	const openDeleteDialog = (comic: Comic) => {
		setSelectedComic(comic);
		setIsOpen(true);
	};

	const handleStockChange = async (comicId: string, quantity: number) => {
		if (!user) {
			toaster.create({
				title: "Login required!",
				description: "You need to register and log in to add comics to your cart.",
				type: "warning",
				duration: 5000,
			});
			return;
		}

		setLoadingComicIds((prev) => [...prev, comicId]);

		// Fetch the current stock of the comic from the comics-sell table
		const { data: comicData, error: comicError } = await supabase
			.from("comics-sell")
			.select("stock, title, image, price, currency")
			.eq("id", comicId)
			.single();

		if (comicError || !comicData) {
			toaster.create({
				title: "Error updating stock.",
				description: "There was an error updating the stock or insufficient stock available.",
				type: "error",
				duration: 5000,
			});
			setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
			return;
		}

		if (comicData.stock < quantity) {
			toaster.create({
				title: "Error updating stock.",
				description: "Insufficient stock available.",
				type: "error",
				duration: 5000,
			});
			setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
			return;
		}

		const existingItem = cart.find((item) => item.comicId === comicId);

		if (existingItem) {
			dispatch(updateCartQuantity({ userId: user.id, comicId, quantity: existingItem.quantity + quantity }))
				.unwrap()
				.then(() => {
					updateStock(
						{ comicId, newStock: comicData.stock - quantity },
						{
							onSuccess: () => {
								setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
								toaster.create({
									title: "Cart updated.",
									description: "The stock has been updated.",
									type: "success",
									duration: 5000,
								});
							},
							onError: () => {
								setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
							},
						}
					);
				})
				.catch(() => {
					toaster.create({
						title: "Error updating cart.",
						description: "There was an error updating the cart.",
						type: "error",
						duration: 5000,
					});
					setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
				});
		} else {
			dispatch(
				addToCart({
					userId: user.id,
					comicId,
					quantity,
					title: comicData.title,
					image: comicData.image,
					price: comicData.price,
					currency: comicData.currency,
					stock: comicData.stock - quantity,
				})
			)
				.unwrap()
				.then(() => {
					updateStock(
						{ comicId, newStock: comicData.stock - quantity },
						{
							onSuccess: () => {
								setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
								toaster.create({
									title: "Added to cart.",
									description: "The comic has been added to your cart.",
									type: "success",
									duration: 5000,
								});
							},
							onError: () => {
								setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
							},
						}
					);
				})
				.catch(() => {
					toaster.create({
						title: "Error adding to cart.",
						description: "There was an error adding the comic to your cart.",
						type: "error",
						duration: 5000,
					});
					setLoadingComicIds((prev) => prev.filter((id) => id !== comicId));
				});
		}
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	//   @ts-ignore
	const totalResults = data?.pages.reduce((acc, page) => acc + (page.comics?.length || 0), 0) || 0;

	return (
		<Container
			maxW="container.xl"
			p={4}
			css={{ minHeight: "100vh" }}
		>
			<SearchBar onSearch={handleSearch} searchQuery={searchQuery} totalResults={totalResults} />
			{isLoading ? (
				<Center h="100vh">
					<Spinner size="xl" />
				</Center>
			) : isError ? (
				<Center h="100vh">
					<Alert.Root status="error">
						<Alert.Indicator />
						<Alert.Description>{"An error occurred"}</Alert.Description>
					</Alert.Root>
				</Center>
			) : (
				<>
					<SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6} width="100%">
						{data?.pages.map((page) =>
							// @ts-ignore
							page.comics
								.filter((comic: Comic) => isAdmin || comic.is_approved)
								.map((comic: Comic) => (
									<MotionDiv
										key={comic.id}
										whileHover={{ scale: 1.05 }}
										style={{
											boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
											borderRadius: "var(--chakra-radii-md)",
											overflow: "hidden",
											position: "relative",
											cursor: "pointer",
										}}
										onClick={() => router.push(`/${comic.id}`)}
									>
										<Box position="relative" width="100%" height="0" paddingBottom="150%">
											<Image
												src={comic.image || defaultImageUrl}
												alt={comic.title}
												width="100%"
												height="100%"
												position="absolute"
												top="0"
												left="0"
												objectFit="cover"
												onError={(e) => {
													e.currentTarget.src = defaultImageUrl;
												}}
											/>
											<Box
												position="absolute"
												bottom="0"
												width="100%"
												bgColor="rgba(0, 0, 0, 0.7)"
												color="white"
												padding={2}
												fontSize={{ base: "sm", md: "md" }}
											>
												<Text fontWeight="bold" fontSize={{ base: "xs", md: "lg" }}>
													{comic.price} {comic.currency}
												</Text>
												<Text fontSize={{ base: "xs", md: "md" }}>In Stock: {comic.stock}</Text>
											</Box>
											{comic.stock === 0 && (
												<Box
													position="absolute"
													top="0"
													left="0"
													width="100%"
													height="40%"
													bgColor="rgba(255, 0, 0, 0.7)"
													color="white"
													display="flex"
													alignItems="center"
													justifyContent="center"
													fontSize={{ base: "lg", md: "lg" }}
													fontWeight="bold"
												>
													Sold Out
												</Box>
											)}
											{isAdmin && !comic.is_approved && (
												<Box
													position="absolute"
													bottom="40"
													left="0"
													width="100%"
													height="10%"
													bgColor="rgba(255, 252, 127, 0.5)"
													color="red.800"
													display="flex"
													alignItems="center"
													justifyContent="center"
													fontSize={{ base: "xs", md: "2xl" }}
													fontWeight="bold"
												>
													Not Approved
												</Box>
											)}
										</Box>
										<Box p={3} bgColor="black" color="white" width="100%">
											<Stack gap={2}>
												<Text
													fontWeight="bold"
													fontSize={{ base: "xs", md: "lg" }}
													lineClamp={1}
													textAlign="center"
												>
													{comic.title}
												</Text>
												<Badge m={1} colorPalette="green" fontSize={{ base: "2xs", md: "sm" }}>
													Released: {formatDate(comic.release_date)}
												</Badge>
												<Badge m={1} colorPalette="purple" fontSize={{ base: "2xs", md: "sm" }}>
													{comic.publisher}
												</Badge>
												<Badge m={1} colorPalette="yellow" fontSize={{ base: "2xs", md: "sm" }}>
													Genre: {comic.genre}
												</Badge>
											</Stack>
										</Box>
										<IconButton
											aria-label="Add to cart"
											colorPalette="yellow"
											position="absolute"
											top={2}
											left={2}
											onClick={(e) => {
												e.stopPropagation();
												handleStockChange(comic.id, 1);
											}}
											size={{ base: "xs", md: "md" }}
											disabled={comic.stock === 0 || loadingComicIds.includes(comic.id)}
										>
											{loadingComicIds.includes(comic.id) ? <Spinner size="sm" /> : <Plus />}
										</IconButton>
										{isAdmin && (
											<Box position="absolute" top={2} right={2} display="flex" gap={1}>
												<NextLink href={`/comics-store/edit/${comic.id}`} passHref>
													<IconButton
														aria-label="Edit Comic"
														fontWeight={"900"}
														color={"white"}
														backgroundColor={"blue.500"}
														size={{ base: "xs", md: "md" }}
														onClick={(e) => e.stopPropagation()}
													>
														<Pencil />
													</IconButton>
												</NextLink>
												<IconButton
													aria-label="Delete Comic"
													fontWeight={"900"}
													color={"white"}
													backgroundColor={"red.500"}
													size={{ base: "xs", md: "md" }}
													onClick={(e) => {
														e.stopPropagation();
														openDeleteDialog(comic);
													}}
												>
													<Trash2 />
												</IconButton>
											</Box>
										)}
									</MotionDiv>
								))
						)}
					</SimpleGrid>
					{isFetchingNextPage && (
						<Center mt={4}>
							<Spinner size="lg" />
						</Center>
					)}
					<div ref={ref} />
				</>
			)}

			<Dialog.Root open={isOpen} onOpenChange={(e) => { if (!e.open) onClose(); }} role="alertdialog">
				<Portal>
					<Dialog.Backdrop />
					<Dialog.Positioner>
						<Dialog.Content>
							<Dialog.Header><Dialog.Title fontSize="lg" fontWeight="bold">Delete Comic</Dialog.Title></Dialog.Header>
							<Dialog.Body>
								Are you sure you want to delete the comic titled {selectedComic?.title}?
							</Dialog.Body>
							<Dialog.Footer>
								<Button onClick={onClose}>
									Cancel
								</Button>
								<Button colorPalette="red" onClick={handleDelete} ml={3}>
									Delete
								</Button>
							</Dialog.Footer>
							<Dialog.CloseTrigger />
						</Dialog.Content>
					</Dialog.Positioner>
				</Portal>
			</Dialog.Root>
		</Container>
	);
};

export default ComicsBuy;
