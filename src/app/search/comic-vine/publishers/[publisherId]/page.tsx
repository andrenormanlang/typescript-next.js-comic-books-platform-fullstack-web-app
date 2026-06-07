"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import {Tag, 
	Box,
	Image,
	Text,
	VStack,
	HStack, Flex,
	Container, Button,
	Center,
	Spinner,
	Accordion,
} from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { NextPage } from "next";
import { useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { parse } from "node-html-parser";
import Parser from "html-react-parser";
import { useGetComicVinePublisher } from "@/hooks/comic-vine/useGetComicVinePublishers";
import ComicVinePublisherDescription from "@/helpers/ComicVineIssues/ComicVinePublisherDescription";
import CharacterCard from "../../characters/[characterId]/characterCard";
import { Character } from "../../characters/[characterId]/characterCard";


const ComicVineCharacter: NextPage = () => {
	// const [comic, setComic] = useState<ComicVineIssue | null>(null);
	const router = useRouter();
	const { searchTerm, currentPage } = useSearchParameters();
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const pathname = usePathname();
	const publisherId = pathname.split("/").pop() || "";
	const searchParams = useSearchParams();

	const {
		data: publisher,
		isLoading,
		isError,
		error,
	} = useGetComicVinePublisher(searchTerm, currentPage, publisherId);

	const renderContentWithImages = (htmlContent: string) => {
		const root = parse(htmlContent);
		const figures = root.querySelectorAll("figure");

		figures.forEach((figure) => {
			const imgElement = figure.querySelector("img");
			if (imgElement) {
				const src = imgElement.getAttribute("src");
				// Replace with Chakra UI Image component
				imgElement.replaceWith(`<Image src="${src}" maxW="100%" height="auto" />`);
			}
		});

		return root.toString();
	};

	const transform = (node: any) => {
		// If it's an image node
		if (node.type === "tag" && node.name === "img") {
			return (
				<Image
					src={node.attribs["data-src"] || node.attribs.src} // Ensure you get the correct source attribute
					alt={node.attribs.alt}
					maxW="100%"
					height="auto"
					// Add any other props you need here
				/>
			);
		}
	};

	const contentContainerStyle = {
		bg: useColorModeValue("white", "gray.800"),
		borderRadius: "md",
		borderWidth: "1px",
		borderColor: useColorModeValue("gray.200", "gray.700"),
		my: 4, // Margin for y-axis (top and bottom)
		overflow: "hidden", // In case of overflow, you can adjust this
		maxWidth: { base: "90vw", sm: "400px", md: "700px", lg: "900px", xl: "1200px" },
		// You could also use percentage values for maxWidth, for example, base: "100%", sm: "90%", etc.
		width: "100%", // Ensure the width is always 100% of the parent container
		px: { base: 1.5, sm: 4, md: 6 }, // Responsive padding on the x-axis (left and right)
		py: { base: 2, sm: 4 }, // Responsive padding on the y-axis (top and bottom)
	};
	const handleBack = () => {
		// Navigate back to the issues page with both the page number and search term
		router.push(`/search/comic-vine/publishers?page=${currentPage}&query=${encodeURIComponent(searchTerm)}`);
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
				Error: {error.message}
			</div>
		);
	}

	const imageUrl = publisher.results?.image?.medium_url || "defaultImageUrl";

	const htmlContent = publisher.results?.description || "No description available.";

	const name = publisher.results?.name || "Unknown Publisher";

	// Sanitize the HTML content
	const sanitizedDescription = publisher ? DOMPurify.sanitize(publisher.results?.description) : "";

	const renderedDescription = publisher ? Parser(sanitizedDescription, { transform }) : "";

	const aliasesArray = publisher.results?.aliases ? publisher.results.aliases.split(/\r\n|\n/) : [];
	const sortedCharacters = publisher.results.characters.sort((a: Character, b: Character) => a.name.localeCompare(b.name));


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
				<VStack gap={2}>
					{/* Content Box */}
					<Flex
						bg={bgColor}
						p={2}
						borderRadius="md"
						borderWidth="1px"
						borderColor={borderColor}
						direction={{ base: "column", md: "row" }}
						align=""
						justify=""
						// maxWidth: { base: "90vw", sm: "500px", md: "800px", lg: "1000px", xl: "1300px" },
						width={{ base: "90vw", sm: "400px", md: "700px", lg: "900px", xl: "1200px" }}
					>
						<VStack gap={4} align="">
							{/* Image */}
							<Box
								bg={bgColor}
								p={4}
								borderRadius="md"
								shadow="md"
								color="red.500"
								// borderWidth="1px"
								borderColor={borderColor}
								maxWidth=""
							>
								<Image
									borderRadius="md"
									maxW={{ base: "100%", md: "300px" }}
									objectFit="contain"
									p={2}
									src={imageUrl}
									alt={`Cover of ${publisher.name}`}
									mb={{ base: 2, md: 0 }}
									mx={{ base: "auto", md: 0 }}
								/>
							</Box>

							<Box
								bg={bgColor}
								p={4}
								borderRadius="md"
								shadow="md"
								color="red.500"
								// borderWidth="1px"
								borderColor={borderColor}
								maxWidth=""
							>
								{/* <Text fontWeight="bold" fontSize={{ base: "1rem", md: "lg" }}textAlign="initial" mt={4}>
									NAME: {publisher.results.real_name}
								</Text>
								<Text fontWeight="bold" color="green" fontSize={{ base: "1rem", md: "lg" }}textAlign="initial" mt={4}>
									BIRTH: {publisher.results.birth}
								</Text> */}
								<Text
									fontWeight="bold"
									color="red.200"
									fontSize={{ base: "1rem" }}
									textAlign="initial"
									mt={4}
								>
									{name}
								</Text>
							</Box>

							<Box
								bg={bgColor}
								p={4}
								borderRadius="md"
								shadow="md"
								borderColor={borderColor}
								maxWidth="full"
								overflowX="auto"
								className="alias-container"
							>
								<Text fontWeight="bold" fontSize={{ base: "1rem", md: "lg" }} mb={2}>
									Aliases:
								</Text>
								<HStack gap={2} wrap="wrap">
									{aliasesArray.map((alias: string, index: React.Key | null | undefined) => (
										<Tag.Root
											key={index}
											borderRadius="full"
											variant="solid"
											colorPalette="teal"
											fontWeight={600}
											fontSize={{ base: "1rem", md: "md" }}
											px={3}
											py={2}
											m={1}
											_hover={{ transform: "scale(1.05)", cursor: "pointer" }}
										>
											<Tag.Label>{alias}</Tag.Label>
										</Tag.Root>
									))}
								</HStack>
							</Box>
							<Box
								bg={bgColor}
								p={4}
								borderRadius="md"
								shadow="md"
								fontSize={{ base: "0.9rem", md: "md" }}
								borderColor={borderColor}
								maxWidth=""
							>
								{publisher.results.deck}
							</Box>
						</VStack>
					</Flex>
				</VStack>
			</Container>
			<Container {...contentContainerStyle}>
				<Accordion.Root >
					<Accordion.Item value="full-description">
						<Accordion.ItemTrigger>
							<Box as="span" color="red" flex="1" textAlign="left">
								<Text fontWeight="bold" fontSize={{ base: "1rem", md: "lg" }} mb={2}>
									FULL DESCRIPTION:
								</Text>
							</Box>
							<Accordion.ItemIndicator />
						</Accordion.ItemTrigger>
						<Accordion.ItemContent pb={4}>
							<ComicVinePublisherDescription content={htmlContent} />
						</Accordion.ItemContent>
					</Accordion.Item>
				</Accordion.Root>
			</Container>
			<Container {...contentContainerStyle}>
				<Accordion.Root >
					<Accordion.Item value="publisher-characters">
						<Accordion.ItemTrigger>
							<Box as="span" color="red" flex="1" textAlign="left">
								<Text fontWeight="bold" fontSize={{ base: "1rem", md: "lg" }} mb={2}>
									PUBLISHER CHARACTERS:
								</Text>
							</Box>
							<Accordion.ItemIndicator />
						</Accordion.ItemTrigger>
						<Accordion.ItemContent pb={4}>
						{sortedCharacters && sortedCharacters.map((character:Character ) => (
          <CharacterCard key={character.id} character={character} />
        ))}
						</Accordion.ItemContent>
					</Accordion.Item>
				</Accordion.Root>
			</Container>
		</Suspense>
	);
};

export default ComicVineCharacter;
