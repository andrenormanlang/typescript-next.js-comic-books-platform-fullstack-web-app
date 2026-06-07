"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { Suspense, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {Tag, 
	Box,
	Image,
	Text,
	VStack,
	HStack, Flex,
	Badge,
	Container, Heading,
	Button,
	Center,
	Spinner,
	SimpleGrid,
} from "@chakra-ui/react";
import { CharacterCredit, PersonCredit, SearchQuery } from "@/types/comic.types";
import { ArrowLeft } from "lucide-react";
import { NextPage } from "next";
import { useGetComicVineIssue } from "@/hooks/comic-vine/useComicVine";
import { useSearchParams } from "next/navigation";

import { getCurrentPage } from "@/helpers/ComicVineIssues/getCurrentPage";
import { useSearchParameters } from "@/hooks/useSearchParameters";

const IssuePage: NextPage = () => {
	// const [comic, setComic] = useState<ComicVineIssue | null>(null);
	const router = useRouter();
	const { searchTerm, currentPage } = useSearchParameters();
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const pathname = usePathname();
	const issueId = pathname.split("/").pop() || "";
	const searchParams = useSearchParams();

	const { data: comic, isLoading, isError, error } = useGetComicVineIssue(searchTerm, currentPage, issueId);

	const handleBack = () => {
		// Read the page number and search term from the search parameters

		// Navigate back to the issues page with both the page number and search term
		router.push(`/search/comic-vine/issues?page=${currentPage}&query=${encodeURIComponent(searchTerm)}`);
	};


	const formatDate = (dateString: string) => {
		const options: Intl.DateTimeFormatOptions = {
			day: "numeric",
			month: "short",
			year: "numeric",
		};
		return new Date(dateString).toLocaleDateString(undefined, options);
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

	const imageUrl = comic.results?.image?.original_url || "defaultImageUrl";
	const volumeName = comic.results?.volume?.name || "Unknown Volume";
	const coverDate = comic.results?.cover_date ? formatDate(comic.results.cover_date) : "Invalid date";
	const issueNumber = comic.results?.issue_number || "N/A";
	const description = comic.results?.description || "No description available.";

	return (
		<Suspense
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
			<Container maxW="1150px" p={4}>
				<Box mb={4}>
					<Button  colorPalette="teal" variant="outline" onClick={handleBack}>
						Back to Grid
					</Button>
				</Box>
				<Box>
					{/* Content Box */}
					<Flex
						bg={bgColor}
						p={4}
						borderRadius="md"
						borderWidth="1px"
						borderColor={borderColor}
						direction={{ base: "column"}}
						align="" // Center align items for better responsiveness
						justify=""

						width={{ base: "100%", md: "90%", lg: "1100px" }} // Responsive width
					>
						{/* Image */}
						<Image
							borderRadius="md"
							maxW={{ base: "100%", md: "600px" }}
							objectFit="contain"
							css={{marginBottom: "5", }}
							width={{ base: "100%", md: "100%" }}
							src={imageUrl}
							alt={`Cover of ${comic.name}`}
						/>

						<Box>
							<HStack justifyContent="" mt={2}>
								<Tag.Root
									fontFamily="Bangers"
									letterSpacing="0.05em"
									size="lg"
									colorPalette="blue"
								>{`Issue #${issueNumber}`}</Tag.Root>
								<Tag.Root fontFamily="Bangers" letterSpacing="0.05em" size="lg" colorPalette="green">
									{coverDate}
								</Tag.Root>
							</HStack>


							<Box
								bg={bgColor}
								p={4}
								borderRadius="md"
								shadow="md"
								borderWidth="0px"
								borderColor={borderColor}
								width={{ base: "100%", md: "100%" }}
							>
								<Heading
								fontFamily="Bangers"
								letterSpacing="0.05em"
								color="tomato"
								textAlign="start"
								size="lg"
								mt={2}
								mb={2}
							>
								{volumeName}
							</Heading>
								{description ? (
									<div
										className="ql-editor"
										dangerouslySetInnerHTML={{
											__html: comic.results.description,
										}}
									/>
								) : (
									<Text fontSize="md" fontStyle="italic">
										No description available.
									</Text>
								)}
							</Box>
						</Box>
					</Flex>
				</Box>
			</Container>
			<Container maxW="1100px" p={4}>
				<Flex direction={{ base: "column"}} align="start" justify="space-between" gap={8}>
					<Box  w="full">
						<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="orange">
							Character Credits:
						</Heading>
						<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
							{comic.results?.character_credits &&
								comic.results?.character_credits.map((character: CharacterCredit) => (
									<Box key={character.id} p={2} boxShadow="md" borderRadius="md">
										<Text textAlign="start">{character.name}</Text>
									</Box>
								))}
						</SimpleGrid>
					</Box>
					<Box w="full">
						<Heading size="md" fontFamily="Bangers" letterSpacing="0.05em" color="lightblue">
							Person Credits:
						</Heading>
						<SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
							{comic.results?.person_credits &&
								comic.results?.person_credits?.map((person: PersonCredit) => (
									<Box key={person.id} p={2} boxShadow="md" borderRadius="md">
										<Text textAlign="start">{person.name}</Text>
										<Badge colorPalette="blue">{person.role}</Badge>
									</Box>
								))}
						</SimpleGrid>
					</Box>
				</Flex>
			</Container>
		</Suspense>
	);
};

export default IssuePage;
