"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { Suspense, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {Tag, 
	Box,
	Image,
	Text,
	VStack, Flex,
	Container, Heading,
	Button,
	Center,
	Spinner,
	SimpleGrid,
} from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import NextLink from "next/link";
import { NextPage } from "next";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useGetMarvelCharacter } from "@/hooks/marvel/useGetMarvelCharacters";
import { ComicItem, CreatorItem, EventItem, SeriesItem, StoryItems } from "@/types/marvel/marvel-comic.type";
import { extractIdFromURI } from "@/helpers/Marvel/extractIdFromURI";
import FlexContainer from "@/helpers/Marvel/FlexContainer";

interface UrlItem {
	type: "detail" | "comiclink" | "wiki"; // Add other types as needed
	url: string;
}

const MarvelCharacter: NextPage = () => {
	// const [comic, setComic] = useState<ComicVineIssue | null>(null);
	const router = useRouter();
	const [setIsLoading] = useState(false);
	const { searchTerm, currentPage } = useSearchParameters();
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const pathname = usePathname();
	const comicId = pathname.split("/").pop() || "";

	const { data, isLoading, isError, error } = useGetMarvelCharacter(comicId);

	const handleBack = () => {
		// Read the page number and search term from the search parameters

		// Navigate back to the issues page with both the page number and search term
		router.push(`/search/marvel/marvel-characters?page=${currentPage}&query=${encodeURIComponent(searchTerm)}`);
	};

	const linkHoverStyle = {
		textDecoration: "none",
		backgroundColor: useColorModeValue("red.100", "red.700"), // change color based on color mode
		transform: "translateY(-2px)", // subtle lift effect
		boxShadow: "lg", // larger shadow for lifted effect
	};

	const getColorScheme = (type: string) => {
		switch (type) {
			case "detail":
				return "blue";
			case "wiki":
				return "green";
			case "comiclink":
				return "red";
			default:
				return "gray";
		}
	};

	const transformDetailUrl = (url: string): string => {
		// Decode URI components to handle encoded characters like %28 and %29
		const decodedUrl = decodeURIComponent(url);

		// Remove the query parameters and the API-specific path segments
		let baseUrl = decodedUrl.split("?")[0];
		baseUrl = baseUrl.replace("/comics/characters/", "/characters/");

		// Extract the character name part and ensure it is the last segment
		const characterNameParts = baseUrl.split("/").pop();

		if (!characterNameParts) {
			throw new Error("URL does not contain a character name part.");
		}

		// Replace underscores with hyphens
		const formattedName = characterNameParts.replace(/_/g, "-").toLowerCase();

		// Construct the new URL
		return `http://marvel.com/characters/${formattedName}`;
	};

	if (isLoading)
		return (
			<Center h="100vh">
				<Spinner size="xl" />
			</Center>
		);

	if (isError) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh", // Full viewport height
					fontFamily: '"Bangers", cursive', // Assuming "Bangers" font is loaded
					fontSize: "1.5rem", // Larger font size
					color: "red", // Red color for the error message
					textAlign: "center",
					padding: "20px",
					backgroundColor: "#f0f0f0", // Light background for visibility
					borderRadius: "10px",
					boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)", // Optional shadow for better appearance
				}}
			>
				Error: {error.message}
			</div>
		);
	}

	const result = data?.data?.results?.[0];

	const solicitationText = result?.description || "No description available.";

	return (
        (<Suspense
			fallback={
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						fontFamily: '"Bangers", cursive',
						fontSize: "1.5rem",
						color: "red",
						textAlign: "center",
						padding: "20px",
						backgroundColor: "#f0f0f0",
						borderRadius: "10px",
						boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
					}}
				>
					Loading...
				</div>
			}
		>
            <Container maxW="1100px" p={4}>
				<Box mb={4}>
					<Button  colorPalette="teal" variant="outline" onClick={handleBack}>
						Back to Grid
					</Button>
				</Box>

				<VStack gap={2}>
					{/* Content Box */}
					<Flex
						bg={bgColor}
						p={4}
						borderRadius="md"
						borderWidth="1px"
						borderColor={borderColor}
						direction={{ base: "column", md: "row" }}
						align="" // Center align items for better responsiveness
						justify=""
						width={{ base: "100%", md: "90%", lg: "1100px" }} // Responsive width
					>
						{/* Image */}
						<Image
							src={`${result?.thumbnail.path}/portrait_uncanny.jpg`}
							alt={data?.data?.results?.[0]?.title || "No Title"}
							maxW="300px"
							maxH="450px"
							objectFit="cover"
							mb={{ base: 4, md: 0 }}
							alignSelf={{ base: "center", md: "auto" }} // Center on mobile, default alignment on larger screens
							justifySelf={{ base: "center", md: "auto" }} // Center on mobile, default alignment on larger screens
							mx={{ base: "auto", md: 0 }} // Horizontal margin auto for mobile to center the image
						/>

						<VStack gap={4} align="start" maxW="1000px" marginLeft={4}>
							<Heading fontFamily="Bangers" letterSpacing="0.05em" color="tomato" size="lg">
								{result?.name}
							</Heading>
							<Text p={4} bg={bgColor} borderRadius="md" borderColor={borderColor}>
								{solicitationText}
								<Flex wrap="wrap" mt={2}>
									{result?.urls.map((urlItem: UrlItem, index: number) => {
										let url = urlItem.url;
										let label = "";

										if (urlItem.type === "comiclink") {
											// Transform the URL for comiclink and label it as 'Detail'
											url = transformDetailUrl(urlItem.url);
											label = "Detail";
										} else if (urlItem.type === "detail") {
											// Do not transform the URL for detail and label it as 'Comiclink'
											label = "Comiclink";
										} else {
											// Exclude any other types, such as 'wiki'
											return null;
										}

										return (
											<Tag.Root
												key={`${urlItem.type}-${index}`}
												colorPalette={getColorScheme(urlItem.type)}
												mr={2}
												mb={2}
											>
												<a href={url} target="_blank" rel="noopener noreferrer">
													{label}
												</a>
											</Tag.Root>
										);
									})}
								</Flex>
							</Text>
						</VStack>
					</Flex>
					<Flex
						bg={bgColor}
						p={4}
						borderRadius="md"
						borderWidth="1px"
						borderColor={borderColor}
						direction={{ base: "column", md: "row" }}
						align="flex-start" // Align children to the start of the cross-axis
						justify="space-between" // Add space between the children
						width={{ base: "100%", md: "90%", lg: "1100px" }} // Responsive width
					>
						<VStack gap={4} align="stretch">
							<Box>
								<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
									Comics:
								</Heading>
								<SimpleGrid columns={{ base: 2, md: 3 }} gap={1}>
									{result?.comics?.items?.map((comicItem: ComicItem) => {
										// Extract the ID inside the map callback function
										const comicId = extractIdFromURI(comicItem.resourceURI);

										return (
                                            // Assuming you have a route set up for comic details
                                            (<NextLink
												href={`/search/marvel/marvel-comics/${comicId}`}
												passHref
												key={comicItem.name}
											>
                                                <FlexContainer
													as="a"
													p={2}
													boxShadow="md"
													borderRadius="md"
													_hover={linkHoverStyle}
												>
													<Text textAlign="start">{comicItem.name}</Text>
												</FlexContainer>
                                            </NextLink>)
                                        );
									})}
								</SimpleGrid>
							</Box>
							<Box>
								<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
									Events:
								</Heading>
								<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
									{result?.events?.items?.map((eventItem: EventItem) => {
										// Extract the ID inside the map callback function
										const comicId = extractIdFromURI(eventItem.resourceURI);

										return (
                                            // Assuming you have a route set up for comic details
                                            (<NextLink
												href={`/search/marvel/marvel-events/${comicId}`}
												passHref
												key={eventItem.name}
											>
                                                <FlexContainer
													as="a"
													p={2}
													boxShadow="md"
													borderRadius="md"
													_hover={linkHoverStyle}
												>
													<Text textAlign="start">{eventItem.name}</Text>
												</FlexContainer>
                                            </NextLink>)
                                        );
									})}
								</SimpleGrid>
							</Box>
							<Box>
								<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
									Creators:
								</Heading>
								<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
									{result?.creators?.items?.map((creatorItem: CreatorItem) => {
										// Extract the ID inside the map callback function
										const comicId = extractIdFromURI(creatorItem.resourceURI);

										return (
                                            // Assuming you have a route set up for comic details
                                            (<NextLink
												href={`/search/marvel/marvel-creators/${comicId}`}
												passHref
												key={creatorItem.name}
											>
                                                <FlexContainer
													as="a"
													p={2}
													boxShadow="md"
													borderRadius="md"
													_hover={linkHoverStyle}
												>
													<Text textAlign="start">{creatorItem.name}</Text>
												</FlexContainer>
                                            </NextLink>)
                                        );
									})}
								</SimpleGrid>
							</Box>
							<Box>
								<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
									Series:
								</Heading>
								<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
									{result?.series?.items?.map((seriesItem: SeriesItem) => {
										// Extract the ID inside the map callback function
										const comicId = extractIdFromURI(seriesItem.resourceURI);

										return (
                                            // Assuming you have a route set up for comic details
                                            (<NextLink
												href={`/search/marvel/marvel-series/${comicId}`}
												passHref
												key={seriesItem.name}
											>
                                                <FlexContainer
													as="a"
													p={2}
													boxShadow="md"
													borderRadius="md"
													_hover={linkHoverStyle}
												>
													<Text textAlign="start">{seriesItem.name}</Text>
												</FlexContainer>
                                            </NextLink>)
                                        );
									})}
								</SimpleGrid>
							</Box>
							<Box>
								<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
									Stories:
								</Heading>
								<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
									{result?.stories?.items?.map((storyItem: StoryItems) => {
										// Extract the ID inside the map callback function
										const comicId = extractIdFromURI(storyItem.resourceURI);

										return (
                                            // Assuming you have a route set up for comic details
                                            (<NextLink
												href={`/search/marvel/marvel-stories/${comicId}`}
												passHref
												key={storyItem.name}
											>
                                                <FlexContainer
													as="a"
													p={2}
													boxShadow="md"
													borderRadius="md"
													_hover={linkHoverStyle}
												>
													<Text textAlign="start">{storyItem.name}</Text>
												</FlexContainer>
                                            </NextLink>)
                                        );
									})}
								</SimpleGrid>
							</Box>
						</VStack>
					</Flex>
				</VStack>
			</Container>
        </Suspense>)
    );
};

export default MarvelCharacter;
