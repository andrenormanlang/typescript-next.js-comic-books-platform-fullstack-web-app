"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useGetSuperhero } from "@/hooks/superhero-api/useGetSuperhero";
import { Superhero } from "@/types/superhero.types";
import { ArrowLeft } from "lucide-react";
import {Tag, 
	Box,
	Button,
	Center,
	Container,
	Image,
	Flex,
	HStack,
	Spinner, Text,
	VStack } from "@chakra-ui/react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

const SuperheroID = () => {
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const { searchTerm, currentPage } = useSearchParameters();
	const pathname = usePathname();
	const superheroId = pathname.split("/").pop() || "";
	const { data, isLoading, isError, error } = useGetSuperhero(
		searchTerm,
		currentPage,
		superheroId
	);

	const router = useRouter();

	const superhero = data as Superhero;

	const powerStatColors = [
		"red",
		"green",
		"blue",
		"orange",
		"purple",
		"cyan",
	];

	const handleBack = () => {
		// Read the page number from the search parameters

		// Navigate back to the issues page with the remembered page number
		router.push(
			`/search/superheros/superhero-api?page=${currentPage}&query=${encodeURIComponent(
				searchTerm
			)}`
		);
	};

	const handleBackList = () => {
		// Read the page number from the search parameters

		// Navigate back to the issues page with the remembered page number
		router.push(`/search/superheros/superheros-list`);
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

	// Render your superhero details using the 'superhero' data object
	return (
		<Container maxW="1300px" p={4}>
			<Flex justifyContent="space-between" mb={4}>
				<Button
					
					colorPalette="teal"
					variant="outline"
					onClick={handleBack}
				>
					Back to Grid
				</Button>
				<Button
					
					colorPalette="orange"
					variant="outline"
					onClick={handleBackList}
				>
					Back to List
				</Button>
			</Flex>
			<VStack gap={4}>
				<Flex
					bg={bgColor}
					p={4}
					borderRadius="md"
					borderWidth="1px"
					borderColor={borderColor}
					direction={{ base: "column", md: "row" }}
					wrap="wrap"
					align="" // Center align items for better responsiveness
					justify=""
					width={{ sm: "100%", md: "100%", lg: "100%" }} // Responsive width
				>
					<Image
						width="300px" // In Chakra UI, width and height can be set directly like this
						height="300px"
						objectFit="contain"
						borderRadius="20%"
						src={superhero.image.url}
						alt={superhero.name}
						mb={{ base: 4, md: 0 }}
						alignSelf={{ base: "center", md: "auto" }} // Center on mobile, default alignment on larger screens
						justifySelf={{ base: "center", md: "auto" }} // Center on mobile, default alignment on larger screens
						mx={{ base: "auto", md: 0 }}
					/>

					<VStack
						ml={5}
						gap={1}
						align="flex-start"
						mb={4}
						minWidth="200px"
					>
						<Text fontSize="2xl" fontWeight="bold">
							{superhero.name}
						</Text>
						<Text fontSize="md">
							Publisher: {superhero.biography.publisher}
						</Text>

						<Text fontSize="1.5rem" fontWeight="bold" minW="200px">
							Power Stats
						</Text>
						{/* Mapping through powerstats for cleaner code */}
						{Object.entries(superhero.powerstats).map(
							([key, value], index) => (
								<Tag.Root
									key={key}
									minWidth="150px"
									m={1}
									colorPalette={
										powerStatColors[
											index % powerStatColors.length
										]
									}
								>
									{`${
										key.charAt(0).toUpperCase() +
										key.slice(1)
									}: ${value}`}
								</Tag.Root>
							)
						)}
					</VStack>

					<VStack
						ml={5}
						gap={2}
						align="flex-start"
						mb={4}
						minW={200}
					>
						<Text fontSize="1.5rem" fontWeight="bold">
							Appearance
						</Text>
						{/* Mapping through powerstats for cleaner code */}
						<Text fontSize="md">
							Gender: {superhero.appearance.gender}
						</Text>
						<Text fontSize="md">
							Race: {superhero.appearance.race}
						</Text>
						<Text fontSize="md">
							{" "}
							Height: {superhero.appearance.height[0]} |{" "}
							{superhero.appearance.height[1]}
						</Text>
						<Text fontSize="md">
							Weight: {superhero.appearance.weight[0]} |{" "}
							{superhero.appearance.weight[1]}
						</Text>
						<Text fontSize="md">
							Eye Color: {superhero.appearance["eye-color"]}
						</Text>
						<Text fontSize="md">
							Hair Color: {superhero.appearance["hair-color"]}
						</Text>
					</VStack>
					<VStack ml={5} gap={1} align="flex-start" mb={4}>
						<Text fontSize="1.5rem" fontWeight="bold">
							Biography
						</Text>
						<Text fontSize="md">
							First Appearance:{" "}
							{superhero.biography["first-appearance"]}
						</Text>
						<Text fontSize="md">
							Aliases: {superhero.biography.aliases.join(", ")}
						</Text>
						<Text fontSize="md">
							Full Name: {superhero.biography["full-name"]}
						</Text>
						<Text fontSize="md">
							Place of Birth:{" "}
							{superhero.biography["place-of-birth"]}
						</Text>
						<Text fontSize="md">
							Alignment: {superhero.biography.alignment}
						</Text>
						<Text fontSize="md">
							Alter-Egos: {superhero.biography["alter-egos"]}
						</Text>
						<Text fontSize="md">
							Occupation: {superhero.work.occupation}
						</Text>
						<Text fontSize="md">Base: {superhero.work.base}</Text>
						<Text fontSize="1.5rem" fontWeight="bold">
							Connection
						</Text>
						<Text fontSize="md">
							Affiliations:{" "}
							{superhero.connections["group-affiliation"]}
						</Text>
						<Text fontSize="md">
							Relatives: {superhero.connections.relatives}
						</Text>
					</VStack>

					<HStack
						ml={5}
						gap={2}
						align="flex-start"
						mb={4}
					></HStack>
				</Flex>
			</VStack>
		</Container>
	);
};

export default SuperheroID;
