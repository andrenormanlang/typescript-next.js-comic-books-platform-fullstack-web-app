"use client";

import React, { useRef, useState, useEffect } from "react";
import {
	Box,
	Button,
	Text,
	Image,
	Link,
	VStack,
	HStack,
	useToast,
	Skeleton,
	Badge,
	Divider,
	Heading,
	SimpleGrid,
	Icon,
	Flex,
	Card,
	CardHeader,
	CardBody,
	CardFooter,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { FaBook, FaPencilAlt, FaPaintBrush, FaBuilding, FaCalendarAlt } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";

interface Suggestion {
	title: string;
	description: string;
	imageUrl: string | null;
	link: string | null;
	year: string;
	type: string;
	publisher: string;
	artist: string;
	writer: string;
	reason: string;
}

type ComicSuggestionApiResponse =
	| { suggestion: Suggestion; meta?: { selectedGenre?: string }; error?: never }
	| { suggestion?: never; error: string };

type EnrichResponse = { imageUrl: string | null; link: string | null; error?: never } | { error: string };

export default function ComicSuggestion() {
	const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
	const [loading, setLoading] = useState(true);
	const [imageError, setImageError] = useState(false);
	const [previousTitles, setPreviousTitles] = useState<string[]>([]);
	const isMountedRef = useRef(true);
	const requestControllerRef = useRef<AbortController | null>(null);
	const enrichControllerRef = useRef<AbortController | null>(null);
	const toast = useToast();
	const router = useRouter();
	const searchParamsLocal = useSearchParams();

	// On first load, fetch a suggestion
	useEffect(() => {
		isMountedRef.current = true;
		fetchSuggestion();
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const fetchSuggestion = async () => {
		try {
			requestControllerRef.current?.abort();
			enrichControllerRef.current?.abort();
			requestControllerRef.current = new AbortController();
			const { signal } = requestControllerRef.current;

			if (isMountedRef.current) {
				setLoading(true);
				setImageError(false);
			}

			// Pass previous titles to avoid repetition (keep small)
			const encodedPrevious = encodeURIComponent(previousTitles.slice(-10).join("|"));

			// Get user input from query parameters
			const userName = searchParamsLocal.get("name") || "";
			const userGenre = searchParamsLocal.get("genre") || "";
			const userStyle = searchParamsLocal.get("style") || "";

			const params = new URLSearchParams();
			if (userName) params.append("name", userName);
			if (userGenre) params.append("genre", userGenre);
			if (userStyle) params.append("style", userStyle);
			const queryStr = params.toString() ? `&${params.toString()}` : "";

			const url = `/api/comic-suggestion?previous=${encodedPrevious}${queryStr}`;
			const response = await fetch(url, { signal });
			const data = (await response.json()) as ComicSuggestionApiResponse;
			if (!isMountedRef.current) return;

			if (data.error) {
				toast({
					title: "Error",
					description: data.error,
					status: "error",
					duration: 5000,
					isClosable: true,
				});
			} else {
				setSuggestion(data.suggestion);
				// Add to previous titles to avoid repetition
				if (data.suggestion.title) {
					setPreviousTitles((prev) => [...prev, data.suggestion.title]);
				}

				// Enrich cover/link without blocking the initial render.
				enrichControllerRef.current = new AbortController();
				const enrichSignal = enrichControllerRef.current.signal;
				const enrichUrl = `/api/comic-suggestion/enrich?title=${encodeURIComponent(data.suggestion.title)}`;
				fetch(enrichUrl, { signal: enrichSignal })
					.then(async (r) => (await r.json()) as EnrichResponse)
					.then((enriched) => {
						if (!isMountedRef.current) return;
						if ("error" in enriched) return;
						setSuggestion((prev) => {
							if (!prev) return prev;
							return {
								...prev,
								imageUrl: enriched.imageUrl,
								link: enriched.link,
							};
						});
					})
					.catch(() => {
						// No fallback data; enrichment failures are silent.
					});
			}
		} catch (error) {
			if (!isMountedRef.current) return;
			if ((error as { name?: string }).name === "AbortError") return;
			toast({
				title: "Error",
				description: "Failed to fetch comic suggestion.",
				status: "error",
				duration: 5000,
				isClosable: true,
			});
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	};

	const handleImageError = () => {
		setImageError(true);
	};

	const goBack = () => {
		router.back();
	};

	return (
		<Box p={4} maxW="800px" mx="auto">
			<Button leftIcon={<ChevronLeftIcon />} onClick={goBack} colorScheme="gray" variant="outline" mb={6}>
				Go Back
			</Button>

			<Heading as="h1" size="xl" mb={6} textAlign="center" color="blue.600">
				AI Comic Book Recommendation
			</Heading>

			{loading ? (
				<Card boxShadow="lg" borderRadius="lg" overflow="hidden">
					<CardBody>
						<SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
							<Skeleton height="400px" borderRadius="md" />
							<VStack align="start" spacing={4}>
								<Skeleton height="40px" width="80%" />
								<Skeleton height="20px" width="40%" />
								<Skeleton height="120px" width="100%" />
								<Skeleton height="80px" width="100%" />
								<Skeleton height="40px" width="60%" />
							</VStack>
						</SimpleGrid>
					</CardBody>
				</Card>
			) : suggestion ? (
				<Card boxShadow="lg" borderRadius="lg" overflow="hidden">
					<CardBody>
						<SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
							<Box>
								{suggestion.imageUrl && !imageError ? (
									<Image
										src={suggestion.imageUrl}
										alt={suggestion.title}
										borderRadius="md"
										onError={handleImageError}
										maxH="500px"
										mx="auto"
										objectFit="contain"
										boxShadow="dark-lg"
									/>
								) : (
									<Skeleton height="400px" borderRadius="md" />
								)}
							</Box>

							<VStack align="start" spacing={4}>
								<Heading as="h2" size="lg" color="purple.600">
									{suggestion.title}
								</Heading>

								<Box display="flex" flexWrap="wrap" gap={2} mb={2}>
									<Badge
										colorScheme="blue"
										fontSize={{ base: "sm", md: "md" }}
										py={{ base: 0.5, md: 1 }}
										px={{ base: 1.5, md: 2 }}
										whiteSpace="normal"
										textAlign="center"
										maxW="100%"
									>
										{suggestion.type}
									</Badge>
								</Box>
								<Box width="100%" p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200">
									<VStack align="stretch" spacing={2}>
										<HStack>
											<Icon as={FaBuilding} color="gray.500" />
											<Text fontWeight="bold">Publisher:</Text>
											<Text>{suggestion.publisher}</Text>
										</HStack>
										<HStack>
											<Icon as={FaCalendarAlt} color="gray.500" />
											<Text fontWeight="bold">Year:</Text>
											<Text>{suggestion.year}</Text>
										</HStack>
										<HStack>
											<Icon as={FaPaintBrush} color="gray.500" />
											<Text fontWeight="bold">Artist:</Text>
											<Text>{suggestion.artist}</Text>
										</HStack>
										<HStack>
											<Icon as={FaPencilAlt} color="gray.500" />
											<Text fontWeight="bold">Writer:</Text>
											<Text>{suggestion.writer}</Text>
										</HStack>
									</VStack>
								</Box>
								<Divider />
								<VStack align="start" spacing={3} width="100%">
									<Heading as="h3" size="sm" color="blue.600">
										<Icon as={FaBook} mr={2} />
										Description:
									</Heading>
									<Text>{suggestion.description}</Text>

									<Heading as="h3" size="sm" color="blue.600" mt={2}>
										Why is worth reading:
									</Heading>
									<Text>{suggestion.reason}</Text>
								</VStack>
							</VStack>
						</SimpleGrid>
					</CardBody>

					<CardFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
						<Flex width="100%" justify="space-between" align="center">
							<Button onClick={fetchSuggestion} colorScheme="blue" leftIcon={<Icon as={FaBook} />}>
								Get Another Suggestion
							</Button>

							{suggestion.link ? (
								<Link href={suggestion.link} isExternal>
									<Button
										rightIcon={<ExternalLinkIcon />}
										colorScheme="teal"
										variant="solid"
										fontWeight="bold"
										color="white"
										_hover={{ bg: "teal.600" }}
										boxShadow="md"
									>
										Learn More
									</Button>
								</Link>
							) : (
								<Button rightIcon={<ExternalLinkIcon />} colorScheme="teal" isDisabled>
									No link yet
								</Button>
							)}
						</Flex>
					</CardFooter>
				</Card>
			) : (
				<Box textAlign="center" p={8}>
					<Text>No suggestion available. Please try again.</Text>
					<Button onClick={fetchSuggestion} colorScheme="blue" mt={4}>
						Get Comic Suggestion
					</Button>
				</Box>
			)}
		</Box>
	);
}
