"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import {Switch, 
	Box,
	Button,
	Image,
	Text,
	Container,
	Center,
	Spinner,
	Heading,
	Badge,
	VStack,
	HStack,
	SimpleGrid,
	Flex } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { ArrowLeft, Plus } from "lucide-react";
import { Comic } from "@/types/comics-store/comic-detail.type";
import { useUser } from "@/contexts/UserContext";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, updateCartQuantity } from "@/store/cartSlice";
import { AppDispatch, RootState } from "@/store/store";
import { useUpdateStock } from "@/hooks/stock-management/useUpdateStock";

// Import the CSS file for styling the rendered rich text content
import '../../../styles/comic-detail-content.css'; // <-- Adjust the path as needed

const ComicDetail = () => {
	const pathname = usePathname();
	const router = useRouter();
	const pathParts = pathname.split("/");
	const id = pathParts.pop(); // Extracts the last segment of the path as the id

	const { user } = useUser();
	const [comic, setComic] = useState<Comic | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);

	const dispatch: AppDispatch = useDispatch();
	const cart = useSelector((state: RootState) => state.cart.items);
	const updateStockMutation = useUpdateStock();

	useEffect(() => {
		if (user) {
			const fetchUserProfile = async () => {
				const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();

				if (error) {
					console.error("Error fetching profile:", error.message);
					return;
				}

				if (data && data.is_admin) {
					setIsAdmin(true);
				}
			};

			fetchUserProfile();
		}
	}, [user]);

	useEffect(() => {
		if (id) {
			const fetchComic = async () => {
				try {
					const { data, error } = await supabase
						.from("comics-sell")
						.select(
							`
              id,
              user_id,
              created_at,
              title,
              image,
              release_date,
              pages,
              publisher,
              main_artist,
              main_writer,
              description,
              price,
              currency,
              stock,
              is_approved
            `
						)
						.eq("id", id as string)
						.single();

					if (error) throw error;

					setComic(data as Comic);
				} catch (error: any) {
					setError(error.message);
				} finally {
					setLoading(false);
				}
			};

			fetchComic();
		}
	}, [id]);

	const addToCartHandler = async (comicId: string) => {
		if (!user) {
			toaster.create({
				title: "Login required.",
				description: "You need to be logged in to add comics to your cart.",
				type: "warning",
				duration: 5000,
			});
			return;
		}

		const existingItem = cart.find((item) => item.comicId === comicId);

		if (existingItem) {
			handleStockChange(comicId, existingItem.quantity + 1);
			return;
		}

		handleStockChange(comicId, 1);
	};

	const handleStockChange = async (comicId: string, quantity: number) => {
		if (!user) return;

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
			return;
		}

		if (comicData.stock < quantity) {
			toaster.create({
				title: "Error updating stock.",
				description: "Insufficient stock available.",
				type: "error",
				duration: 5000,
			});
			return;
		}

		const existingItem = cart.find((item) => item.comicId === comicId);

		if (existingItem) {
			const newQuantity = existingItem.quantity + quantity;
			const stockDifference = quantity;

			dispatch(updateCartQuantity({ userId: user.id, comicId, quantity: newQuantity }))
				.unwrap()
				.then(() => {
					updateStockMutation.mutate({ comicId, newStock: comicData.stock - stockDifference });
					toaster.create({
						title: "Cart updated.",
						description: "The stock has been updated.",
						type: "success",
						duration: 5000,
					});
				})
				.catch(() => {
					toaster.create({
						title: "Error updating cart.",
						description: "There was an error updating the cart.",
						type: "error",
						duration: 5000,
					});
				});
		} else {
			const stockDifference = quantity;

			dispatch(
				addToCart({
					userId: user.id,
					comicId,
					quantity,
					title: comicData.title,
					image: comicData.image,
					price: comicData.price,
					currency: comicData.currency,
					stock: comicData.stock - stockDifference,
				})
			)
				.unwrap()
				.then(() => {
					updateStockMutation.mutate({ comicId, newStock: comicData.stock - stockDifference });
					toaster.create({
						title: "Added to cart.",
						description: "The comic has been added to your cart.",
						type: "success",
						duration: 5000,
					});
				})
				.catch(() => {
					toaster.create({
						title: "Error adding to cart.",
						description: "There was an error adding the comic to your cart.",
						type: "error",
						duration: 5000,
					});
				});
		}
	};

	const toggleApproval = async () => {
		if (comic) {
			try {
				const { error } = await supabase
					.from("comics-sell")
					.update({ is_approved: !comic.is_approved })
					.eq("id", comic.id);

				if (error) throw error;

				setComic({ ...comic, is_approved: !comic.is_approved });

				toaster.create({
					title: comic.is_approved ? "Comic disapproved." : "Comic approved.",
					description: comic.is_approved
						? "The comic has been set to not approved."
						: "The comic has been approved.",
					type: "success",
					duration: 5000,
				});
			} catch (error) {
				toaster.create({
					title: "Error updating comic.",
					description: "There was an error updating the comic.",
					type: "error",
					duration: 5000,
				});
			}
		}
	};

	if (loading) {
		return (
			<Center h="100vh">
				<Spinner size="xl" />
			</Center>
		);
	}

	if (error) {
		return (
			<Center h="100vh">
				<Text>Error: {error}</Text>
			</Center>
		);
	}

	if (!comic) {
		return (
			<Center h="100vh">
				<Text>Comic not found</Text>
			</Center>
		);
	}

	const formatDate = (dateString: string) => {
		const options: Intl.DateTimeFormatOptions = {
			day: "numeric",
			month: "short",
			year: "numeric",
		};
		return new Date(dateString).toLocaleDateString(undefined, options);
	};

	return (
		<>
			<Container maxW="container.xl" p={4}>
				<Box mb={4}>
					<Button
						
						colorPalette="teal"
						variant="outline"
						onClick={() => router.back()}
						size={{ base: "sm", md: "md" }} // Responsive button size
					>
						Back to Grid
					</Button>
				</Box>
				<Flex
					direction={{ base: "column", md: "row" }}
					bg="gray.800"
					p={{ base: 4, md: 6 }} // Responsive padding
					borderRadius="md"
					borderWidth="1px"
					borderColor="gray.700"
				>
					<Box flex="1" mb={{ base: 4, md: 0 }}>
						<Image
							borderRadius="md"
							objectFit="contain"
							src={comic.image || "/default-image.jpg"} // Use absolute path for public folder
							alt={`Cover of ${comic.title}`}
							width="100%"
							height={{ base: "auto", md: "400px" }} // Responsive image height
						/>
					</Box>
					<VStack flex="2" align="start" gap={4} p={{ base: 2, md: 4 }}>
						<Heading as="h1" size={{ base: "lg", md: "xl" }} color="tomato">
							{comic.title}
						</Heading>
						<HStack gap={4}>
							<Badge colorPalette="green" fontSize={{ base: "0.8em", md: "1.2em" }}>
								RELEASED {formatDate(comic.release_date)}
							</Badge>
						</HStack>
						<HStack gap={4}>
							<Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
								<strong>{comic.publisher}</strong>
							</Text>
						</HStack>
						<HStack gap={4}>
							<Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
								<strong>{comic.pages} pages</strong>
							</Text>
							<Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
								<strong>
									{comic.currency} {comic.price}
								</strong>
							</Text>
						</HStack>
						<Box>
							<Heading as="h2" size={{ base: "sm", md: "md" }} color="orange" mb={2}>
								Credits
							</Heading>
							<SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
								<Box>
									<Text color="white">
										<strong>Main Artist:</strong> {comic.main_artist}
									</Text>
								</Box>
								<Box>
									<Text color="white">
										<strong>Main Writer:</strong> {comic.main_writer}
									</Text>
								</Box>
							</SimpleGrid>
						</Box>
						{isAdmin && (
							<HStack gap={4} align="center">
								<Switch.Root
									size={{ base: "sm", md: "lg" }}
									colorPalette="teal"
									checked={comic.is_approved}
									onChange={toggleApproval}
								/>
								<Text color="white" fontSize={{ base: "sm", md: "md" }}>
									{comic.is_approved ? "Approved" : "Not Approved"}
								</Text>
							</HStack>
						)}
						<Button
							
							colorPalette="yellow"
							onClick={() => addToCartHandler(comic.id)}
							disabled={comic.stock === 0}
							size={{ base: "sm", md: "md" }} // Responsive button size
						>
							Add to Cart
						</Button>
					</VStack>
				</Flex>
			</Container>
			<Container maxW="container.xl" p={4}>
				<Flex
					direction={{ base: "column", md: "row" }}
					bg="gray.800"
					p={{ base: 4, md: 6 }} // Responsive padding
					borderRadius="md"
					borderWidth="1px"
					borderColor="gray.700"
				>
					<Box width="100%">
						{/* Add a wrapper Box with a class name */}
						<Box className="comic-description-content">
							<Text
								width="100%"
								// Removed className="ql-editor"
								fontSize={{ base: "sm", md: "lg" }}
								color="white"
								textAlign="start"
								dangerouslySetInnerHTML={{ __html: comic.description }}
							/>
						</Box> {/* <-- Close the wrapper Box */}
					</Box>
				</Flex>
			</Container>
		</>
	);
};

export default ComicDetail;
